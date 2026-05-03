import { create } from "zustand";
import { pollForToken, requestDeviceCode, type DeviceCodeRequest } from "@lazylingo/core";
import { env } from "../env";

const TOKEN_KEY = "lazylingo:gh-token";

type AuthStatus = "idle" | "awaiting_user" | "signed_in" | "error";

interface AuthState {
  status: AuthStatus;
  token: string | null;
  deviceCode: DeviceCodeRequest | null;
  error: string | null;
  hydrate: () => Promise<string | null>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: "idle",
  token: null,
  deviceCode: null,
  error: null,

  hydrate: async () => {
    const stored = (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY] as string | undefined;
    if (stored) set({ status: "signed_in", token: stored });
    return stored ?? null;
  },

  signIn: async () => {
    if (get().status === "awaiting_user") return;
    set({ status: "idle", error: null });
    try {
      const dc = await requestDeviceCode(env.githubClientId, "repo");
      set({ status: "awaiting_user", deviceCode: dc });
      const token = await pollForToken(env.githubClientId, dc.deviceCode, dc.interval);
      await chrome.storage.local.set({ [TOKEN_KEY]: token });
      set({ status: "signed_in", token, deviceCode: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ status: "error", error: message, deviceCode: null });
    }
  },

  signOut: async () => {
    await chrome.storage.local.remove(TOKEN_KEY);
    set({ status: "idle", token: null, deviceCode: null, error: null });
  },
}));
