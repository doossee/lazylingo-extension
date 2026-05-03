import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "./auth.store";

vi.mock("@lazylingo/core", () => ({
  requestDeviceCode: vi.fn(),
  pollForToken: vi.fn(),
}));

import { requestDeviceCode, pollForToken } from "@lazylingo/core";

const TOKEN_KEY = "lazylingo:gh-token";

beforeEach(() => {
  useAuth.setState({
    status: "idle",
    token: null,
    deviceCode: null,
    error: null,
  });
});

describe("auth.store", () => {
  it("hydrate with stored token transitions to signed_in", async () => {
    await chrome.storage.local.set({ [TOKEN_KEY]: "gh-token-abc" });
    const result = await useAuth.getState().hydrate();
    expect(result).toBe("gh-token-abc");
    expect(useAuth.getState().status).toBe("signed_in");
    expect(useAuth.getState().token).toBe("gh-token-abc");
  });

  it("hydrate with no stored token stays idle", async () => {
    const result = await useAuth.getState().hydrate();
    expect(result).toBeNull();
    expect(useAuth.getState().status).toBe("idle");
  });

  it("signIn happy path transitions through awaiting_user then signed_in", async () => {
    const mockDc = {
      deviceCode: "device-code-123",
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    };
    vi.mocked(requestDeviceCode).mockResolvedValue(mockDc);
    vi.mocked(pollForToken).mockResolvedValue("gh-token-xyz");

    const statuses: string[] = [];
    const unsub = useAuth.subscribe((s) => statuses.push(s.status));

    await useAuth.getState().signIn();
    unsub();

    expect(statuses).toContain("awaiting_user");
    expect(statuses).toContain("signed_in");
    expect(useAuth.getState().token).toBe("gh-token-xyz");
    const stored = (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY];
    expect(stored).toBe("gh-token-xyz");
  });

  it("signOut clears storage and resets state", async () => {
    await chrome.storage.local.set({ [TOKEN_KEY]: "gh-token-abc" });
    useAuth.setState({ status: "signed_in", token: "gh-token-abc" });

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("idle");
    expect(useAuth.getState().token).toBeNull();
    const stored = (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY];
    expect(stored).toBeUndefined();
  });

  it("pollForToken error sets error state", async () => {
    const mockDc = {
      deviceCode: "device-code-123",
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    };
    vi.mocked(requestDeviceCode).mockResolvedValue(mockDc);
    vi.mocked(pollForToken).mockRejectedValue(new Error("access_denied"));

    await useAuth.getState().signIn();

    expect(useAuth.getState().status).toBe("error");
    expect(useAuth.getState().error).toBe("access_denied");
    expect(useAuth.getState().token).toBeNull();
  });
});
