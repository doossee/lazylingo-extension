// Service worker placeholder. The popup carries all UI/auth/storage logic in v0.2.
// Future versions will use this for context-menu / right-click capture.
chrome.runtime.onInstalled.addListener(() => {
  console.log("LazyLingo extension installed");
});

export {};
