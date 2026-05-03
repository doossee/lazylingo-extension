import { create } from "zustand";

const KEY = "lazylingo:settings";

interface SettingsState {
  sourceLang: string;
  targetLang: string;
  setTargetLang: (lang: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persist(s: { sourceLang: string; targetLang: string }) {
  await chrome.storage.local.set({ [KEY]: { sourceLang: s.sourceLang, targetLang: s.targetLang } });
}

export const useSettings = create<SettingsState>((set, get) => ({
  sourceLang: "en",
  targetLang: "ru",
  setTargetLang: async (lang) => {
    set({ targetLang: lang });
    await persist(get());
  },
  hydrate: async () => {
    const stored = (await chrome.storage.local.get(KEY))[KEY] as
      | { sourceLang?: string; targetLang?: string }
      | undefined;
    if (!stored) return;
    if (stored.sourceLang) set({ sourceLang: stored.sourceLang });
    if (stored.targetLang) set({ targetLang: stored.targetLang });
  },
}));
