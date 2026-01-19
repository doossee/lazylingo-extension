console.log("LazyLingo Background Service Worker Started");

chrome.runtime.onInstalled.addListener(() => {
  console.log("LazyLingo Extension Installed");
});

// Handle auth token storage from callback page
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "STORE_TOKEN") {
    chrome.storage.local.set(
      {
        token: message.token,
        refreshToken: message.refreshToken,
      },
      () => {
        console.log("Token stored successfully");

        // Notify popup
        chrome.runtime.sendMessage({
          type: "AUTH_SUCCESS",
          token: message.token,
        });

        sendResponse({ success: true });
      }
    );
    return true; // Keep message channel open for async response
  }
});
