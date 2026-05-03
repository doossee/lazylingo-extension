import { describe, it, expect, vi, beforeEach } from "vitest";
import { useVault } from "./vault.store";

// Mock Vault class
vi.mock("@lazylingo/core", () => {
  const MockVault = vi.fn(function (this: { cfg: unknown }, cfg: unknown) {
    this.cfg = cfg;
  });
  return { Vault: MockVault };
});

import { Vault } from "@lazylingo/core";

beforeEach(() => {
  useVault.setState({ vault: null, owner: null, status: "idle", error: null });
  vi.stubGlobal("fetch", vi.fn());
});

function mockFetch(...responses: Array<{ ok: boolean; status: number; json?: () => Promise<unknown> }>) {
  let call = 0;
  vi.mocked(fetch).mockImplementation(async () => {
    const r = responses[call++] ?? responses[responses.length - 1];
    return {
      ok: r.ok,
      status: r.status,
      json: r.json ?? (() => Promise.resolve({})),
    } as Response;
  });
}

describe("vault.store", () => {
  it("bootstrap with existing vault repo sets ready status", async () => {
    mockFetch(
      { ok: true, status: 200, json: () => Promise.resolve({ login: "testuser" }) },
      { ok: true, status: 200 },
    );

    await useVault.getState().bootstrap("token-123");

    expect(useVault.getState().status).toBe("ready");
    expect(useVault.getState().owner).toBe("testuser");
    expect(useVault.getState().vault).toBeTruthy();
    expect(Vault).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "testuser", repo: "lazylingo-vault", token: "token-123" }),
    );
  });

  it("bootstrap with 404 creates vault repo then sets ready", async () => {
    mockFetch(
      { ok: true, status: 200, json: () => Promise.resolve({ login: "newuser" }) },
      { ok: false, status: 404 },
      { ok: true, status: 201 },
    );

    await useVault.getState().bootstrap("token-abc");

    expect(useVault.getState().status).toBe("ready");
    expect(useVault.getState().owner).toBe("newuser");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("/user 401 sets error state", async () => {
    mockFetch({ ok: false, status: 401 });

    await useVault.getState().bootstrap("bad-token");

    expect(useVault.getState().status).toBe("error");
    expect(useVault.getState().error).toContain("401");
    expect(useVault.getState().vault).toBeNull();
  });
});
