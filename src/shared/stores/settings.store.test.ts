import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSettings } from "./settings.store";

beforeEach(() => {
  // chrome.storage shim is reset by the global beforeEach in test/setup.ts
  useSettings.setState({ sourceLang: "en", targetLang: "ru" });
});

afterEach(async () => {
  await chrome.storage.local.clear();
});

describe("settings.store", () => {
  it("defaults to en→ru", () => {
    expect(useSettings.getState().sourceLang).toBe("en");
    expect(useSettings.getState().targetLang).toBe("ru");
  });

  it("setTargetLang persists to chrome.storage.local", async () => {
    await useSettings.getState().setTargetLang("uz");
    expect(useSettings.getState().targetLang).toBe("uz");
    const stored = (await chrome.storage.local.get("lazylingo:settings"))["lazylingo:settings"];
    expect(stored).toEqual({ sourceLang: "en", targetLang: "uz" });
  });

  it("hydrate restores persisted values", async () => {
    await chrome.storage.local.set({ "lazylingo:settings": { sourceLang: "en", targetLang: "es" } });
    await useSettings.getState().hydrate();
    expect(useSettings.getState().targetLang).toBe("es");
  });
});
