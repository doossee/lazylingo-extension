import { describe, expect, it } from "vitest";
import { humanizeError } from "./humanize-error";

describe("humanizeError", () => {
  it("explains a dictionary miss and echoes the word", () => {
    expect(humanizeError(new Error("word not found: xyzqq"))).toMatch(/couldn't find "xyzqq"/i);
  });

  it("maps GitHub auth failures to a sign-in hint", () => {
    expect(humanizeError(new Error("/user 401"))).toMatch(/sign out and sign back in/i);
  });

  it("maps a write conflict to a try-again message", () => {
    expect(humanizeError(new Error("github put 409"))).toMatch(/changed somewhere else/i);
  });

  it("maps network failures to a connection hint", () => {
    expect(humanizeError(new TypeError("Failed to fetch"))).toMatch(/connection/i);
  });

  it("maps a declined device-flow sign-in", () => {
    expect(humanizeError(new Error("device flow error: access_denied"))).toMatch(/declined/i);
  });

  it("names the translation service when MyMemory fails", () => {
    expect(humanizeError("mymemory 503")).toMatch(/translation service/i);
  });

  it("falls back generically and never leaks raw text", () => {
    const out = humanizeError(new Error("ECONNRESET boom"));
    expect(out).toMatch(/something went wrong/i);
    expect(out).not.toMatch(/ECONNRESET/);
  });
});
