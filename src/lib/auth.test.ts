import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, hashPassword, verifySessionToken } from "./auth";

describe("src/lib/auth.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T10:00:00.000Z"));
  });

  it("hashPassword returns deterministic sha256 hash when password is same", () => {
    const first = hashPassword("123456");
    const second = hashPassword("123456");

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toBe("123456");
  });

  it("verifySessionToken returns user id when token is valid", () => {
    const token = createSessionToken("dad");

    expect(verifySessionToken(token)).toEqual({ userId: "dad" });
  });

  it("verifySessionToken returns null when signature is tampered", () => {
    const token = createSessionToken("dad");
    const [payload] = token.split(".");
    const forgedSig = createHmac("sha256", "wrong-secret").update(payload).digest("base64url");

    expect(verifySessionToken(`${payload}.${forgedSig}`)).toBeNull();
  });

  it("verifySessionToken returns null when token is expired", () => {
    const token = createSessionToken("dad");

    vi.setSystemTime(new Date("2026-04-22T10:00:00.001Z"));

    expect(verifySessionToken(token)).toBeNull();
  });

  it("verifySessionToken returns null when token format is invalid", () => {
    expect(verifySessionToken("invalid-token")).toBeNull();
  });
});
