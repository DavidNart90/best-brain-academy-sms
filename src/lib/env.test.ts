import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnvironment, parsePublicEnvironment } from "./env";
const key = "sb_publishable_synthetic_test_only";
afterEach(() => vi.unstubAllEnvs());
describe("public environment validation", () => {
  it("accepts HTTPS and loopback-only HTTP", () => {
    for (const url of [
      "https://example.supabase.co",
      "http://127.0.0.1:54329",
      "http://localhost:54321",
    ])
      expect(
        parsePublicEnvironment({ url, publishableKey: key }),
      ).not.toBeNull();
  });
  it("rejects secret keys, missing configuration and insecure remote targets", () => {
    expect(parsePublicEnvironment({})).toBeNull();
    expect(
      parsePublicEnvironment({
        url: "https://YOUR_PROJECT_REF.supabase.co",
        publishableKey: "sb_publishable_REPLACE_WITH_PUBLIC_KEY",
      }),
    ).toBeNull();
    expect(
      parsePublicEnvironment({
        url: "https://example.supabase.co",
        publishableKey: "sb_secret_should_never_be_public",
      }),
    ).toBeNull();
    expect(
      parsePublicEnvironment({
        url: "http://example.supabase.co",
        publishableKey: key,
      }),
    ).toBeNull();
    expect(
      parsePublicEnvironment({ url: "ftp://localhost", publishableKey: key }),
    ).toBeNull();
  });
  it("reads only explicitly public variables", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    expect(getPublicEnvironment()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: key,
    });
  });
});
