document.addEventListener("DOMContentLoaded", () => {
  const bookmarkBtn = document.getElementById("bookmark");
  const timestampList = document.getElementById("timestampList");
  const tagsInput = document.getElementById("tags");
  const exportBtn = document.getElementById("export");
  const darkModeToggle = document.getElementById("darkModeToggle");

  // Load dark mode preference
  chrome.storage.sync.get(["darkModeEnabled"], (data) => {
    if (data.darkModeEnabled) {
      document.body.classList.add("dark");
      darkModeToggle.checked = true;
    }
  });

  // Handle dark mode toggle
  darkModeToggle.addEventListener("change", () => {
    const isDark = darkModeToggle.checked;
    document.body.classList.toggle("dark", isDark);
    chrome.storage.sync.set({ darkModeEnabled: isDark });
  });

  // Handle bookmark button click
  bookmarkBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: getCurrentTimestamp
        },
        (results) => {
          if (results && results[0].result !== null) {
            saveTimestamp(tab.url, results[0].result);
          }
        }
      );
    });
  });

  // Handle export
  exportBtn.addEventListener("click", () => {
    chrome.storage.sync.get({ timestamps: [] }, (data) => {
      const json = JSON.stringify(data.timestamps, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "youtube_timestamps.json";
      a.click();

      URL.revokeObjectURL(url);
    });
  });

  // Util: get timestamp from video
  function getCurrentTimestamp() {
    const video = document.querySelector("video");
    return video ? Math.floor(video.currentTime) : null;
  }

  // Util: get YouTube video ID from URL
  function getVideoIdFromUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.slice(1);
      }
      return parsedUrl.searchParams.get("v");
    } catch (e) {
      return null;
    }
  }

  // Save timestamp to storage
  function saveTimestamp(videoUrl, timestamp) {
    const videoId = getVideoIdFromUrl(videoUrl);
    const tags = tagsInput.value.trim();
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "";

    const timestampEntry = {
      url: `${videoUrl}&t=${timestamp}s`,
      time: timestamp,
      tags,
      thumbnailUrl,
      favorite: false
    };

    chrome.storage.sync.get({ timestamps: [] }, (data) => {
      const timestamps = data.timestamps || [];
      timestamps.push(timestampEntry);
      chrome.storage.sync.set({ timestamps }, displayTimestamps);
      tagsInput.value = "";
    });
  }

  // Display all timestamps
  function displayTimestamps() {
    chrome.storage.sync.get({ timestamps: [] }, (data) => {
      timestampList.innerHTML = "";

      const sorted = [...data.timestamps].sort((a, b) => {
        return (b.favorite === true) - (a.favorite === true);
      });

      sorted.forEach((entry, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
          <img src="${entry.thumbnailUrl}" alt="Thumbnail" width="100" />
          <a href="#" data-url="${entry.url}">Jump to ${entry.time}s</a>
          <span class="tags">${entry.tags}</span>
          <button class="edit" data-index="${index}">Edit</button>
          <button class="delete" data-index="${index}">X</button>
          <button class="fav" data-index="${index}">${entry.favorite ? "★" : "☆"}</button>
        `;

        li.querySelector("a").addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.sendMessage({ action: "openTimestamp", url: entry.url });
        });

        li.querySelector(".edit").addEventListener("click", () => {
          const newTags = prompt("Edit tags:", entry.tags);
          if (newTags !== null) {
            entry.tags = newTags;
            updateTimestamp(index, entry);
          }
        });

        li.querySelector(".delete").addEventListener("click", () => {
          removeTimestamp(index);
        });

        li.querySelector(".fav").addEventListener("click", () => {
          entry.favorite = !entry.favorite;
          updateTimestamp(index, entry);
        });

        timestampList.appendChild(li);
      });
    });
  }

  // Update entry
  function updateTimestamp(index, updatedEntry) {
    chrome.storage.sync.get({ timestamps: [] }, (data) => {
      const timestamps = data.timestamps;
      timestamps[index] = updatedEntry;
      chrome.storage.sync.set({ timestamps }, displayTimestamps);
    });
  }

  // Remove entry
  function removeTimestamp(index) {
    chrome.storage.sync.get({ timestamps: [] }, (data) => {
      const timestamps = data.timestamps;
      timestamps.splice(index, 1);
      chrome.storage.sync.set({ timestamps }, displayTimestamps);
    });
  }

  // Initial display
  displayTimestamps();
});
