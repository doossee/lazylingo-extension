import { create } from "zustand";
import { Vault, type VaultConfig } from "@lazylingo/core";

type VaultStatus = "idle" | "bootstrapping" | "ready" | "error";

interface VaultState {
  vault: Vault | null;
  owner: string | null;
  status: VaultStatus;
  error: string | null;
  bootstrap: (token: string) => Promise<void>;
  reset: () => void;
}

const VAULT_REPO = "lazylingo-vault";
const API = "https://api.github.com";

async function gh(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
}

export const useVault = create<VaultState>((set) => ({
  vault: null,
  owner: null,
  status: "idle",
  error: null,

  bootstrap: async (token) => {
    set({ status: "bootstrapping", error: null });
    try {
      const userRes = await gh(token, "/user");
      if (!userRes.ok) throw new Error(`/user ${userRes.status}`);
      const { login } = (await userRes.json()) as { login: string };

      let defaultBranch: string | undefined;
      const probeRes = await gh(token, `/repos/${login}/${VAULT_REPO}`);
      if (probeRes.status === 404) {
        const createRes = await gh(token, "/user/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: VAULT_REPO, private: true, auto_init: true }),
        });
        if (!createRes.ok) throw new Error(`create vault ${createRes.status}`);
        const created = (await createRes.json()) as { default_branch?: string };
        defaultBranch = created.default_branch;
      } else if (probeRes.ok) {
        const probed = (await probeRes.json()) as { default_branch?: string };
        defaultBranch = probed.default_branch;
      } else {
        throw new Error(`probe vault ${probeRes.status}`);
      }

      const cfg: VaultConfig = { owner: login, repo: VAULT_REPO, token, branch: defaultBranch ?? "main" };
      set({ vault: new Vault(cfg), owner: login, status: "ready" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ status: "error", error: message, vault: null });
    }
  },

  reset: () => set({ vault: null, owner: null, status: "idle", error: null }),
}));
