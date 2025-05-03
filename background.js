// Listen for keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
    if (command === "bookmark-timestamp") {
      handleTimestampBookmarking();
    }
  });
  
  async function handleTimestampBookmarking() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes("youtube.com/watch")) {
        console.log("Not a YouTube video page");
        return;
      }
  
      // Execute script to get current timestamp
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getCurrentTimestamp,
      });
  
      if (result?.result !== null) {
        await saveTimestamp(tab.url, result.result);
        // Send feedback to content script
        chrome.tabs.sendMessage(tab.id, {
          action: "showBookmarkFeedback",
          timestamp: result.result
        });
      }
    } catch (error) {
      console.error("Error bookmarking timestamp:", error);
    }
  }
  
  function getCurrentTimestamp() {
    const video = document.querySelector("video");
    return video ? Math.floor(video.currentTime) : null;
  }
  
  async function saveTimestamp(videoUrl, timestamp) {
    // Clean URL by removing existing timestamp parameters
    const cleanUrl = videoUrl.split('&t=')[0].split('?t=')[0];
    const timestampEntry = {
      url: `${cleanUrl}&t=${timestamp}s`,
      time: timestamp,
      createdAt: new Date().toISOString(),
      videoId: new URL(cleanUrl).searchParams.get("v") || ""
    };
  
    // Get existing timestamps and add new one
    const { timestamps = [] } = await chrome.storage.local.get("timestamps");
    timestamps.push(timestampEntry);
    await chrome.storage.local.set({ timestamps });
  }