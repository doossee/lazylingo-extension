const MENU_ID = "lazylingo-save-selection";
const PENDING_KEY = "lazylingo:pending-word";

function registerMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Save "%s" to LazyLingo',
      contexts: ["selection"],
    });
  });
}

chrome.runtime.onInstalled.addListener(registerMenu);
chrome.runtime.onStartup.addListener(registerMenu);

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const word = (info.selectionText ?? "").trim();
  if (!word) return;
  await chrome.storage.local.set({ [PENDING_KEY]: word });
  // Try to open the popup. openPopup is supported on Chrome 127+.
  try {
    await chrome.action.openPopup();
  } catch {
    // Fallback: nothing else we can reasonably do without a content script.
    // The next time the user clicks the extension icon, the pre-fill will activate.
  }
});

export {};
