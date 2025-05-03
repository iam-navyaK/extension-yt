chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTimestamp") {
      let video = document.querySelector("video");
      if (video) {
        let currentTime = Math.floor(video.currentTime);
        sendResponse({ timestamp: currentTime });
      }
    }
    
    if (message.action === "getTags") {
      // This is where we would potentially get any data for tags from the current context.
      // If tags are entered on a webpage or provided somewhere, we'd handle it here.
      sendResponse({ tags: [] }); // Placeholder response, as we store tags on popup.js.
    }
    
    return true; // Required for async response
  });