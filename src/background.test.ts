import { describe, expect, it, vi, beforeEach } from "vitest";

interface ChromeMocks {
  onInstalled: { _fire: (...args: unknown[]) => void };
  onStartup: { _fire: (...args: unknown[]) => void };
  ctxMenuOnClicked: { _fire: (...args: unknown[]) => void };
  ctxMenuCreate: ReturnType<typeof vi.fn>;
  ctxMenuRemoveAll: ReturnType<typeof vi.fn>;
  actionOpenPopup: ReturnType<typeof vi.fn>;
}

const mocks = (globalThis as Record<string, unknown>).__chromeMocks__ as ChromeMocks;

beforeEach(() => {
  vi.resetModules();
});

describe("background", () => {
  it("registers a context-menu item on install", async () => {
    await import("./background");
    mocks.onInstalled._fire({});
    expect(mocks.ctxMenuRemoveAll).toHaveBeenCalled();
    expect(mocks.ctxMenuCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "lazylingo-save-selection",
        title: 'Save "%s" to LazyLingo',
        contexts: ["selection"],
      }),
    );
  });

  it("on click, persists the selection and opens the popup", async () => {
    await import("./background");
    mocks.ctxMenuOnClicked._fire({
      menuItemId: "lazylingo-save-selection",
      selectionText: "  serendipity  ",
    });
    // wait for async listener to complete
    await Promise.resolve();
    await Promise.resolve();
    const stored = await chrome.storage.local.get("lazylingo:pending-word");
    expect(stored["lazylingo:pending-word"]).toBe("serendipity");
    expect(mocks.actionOpenPopup).toHaveBeenCalled();
  });

  it("ignores clicks on other menu items", async () => {
    await import("./background");
    mocks.ctxMenuOnClicked._fire({ menuItemId: "other", selectionText: "x" });
    await Promise.resolve();
    const stored = await chrome.storage.local.get("lazylingo:pending-word");
    expect(stored["lazylingo:pending-word"]).toBeUndefined();
  });

  it("ignores empty selection", async () => {
    await import("./background");
    mocks.ctxMenuOnClicked._fire({
      menuItemId: "lazylingo-save-selection",
      selectionText: "   ",
    });
    await Promise.resolve();
    const stored = await chrome.storage.local.get("lazylingo:pending-word");
    expect(stored["lazylingo:pending-word"]).toBeUndefined();
  });
});
