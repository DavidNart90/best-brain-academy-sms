import { describe, expect, it, vi } from "vitest";
import {
  consumeLocalRateLimit,
  isTrustedMutationRequest,
  readBoundedJson,
  RequestBodyTooLargeError,
} from "./request";

vi.mock("server-only", () => ({}));

function mutationRequest(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/example", {
    method: "POST",
    headers,
  });
}

describe("mutation request protection", () => {
  it("accepts a same-origin browser request", () => {
    const request = mutationRequest({
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
    });

    expect(isTrustedMutationRequest(request)).toBe(true);
  });

  it("rejects cross-origin and cross-site requests", () => {
    expect(
      isTrustedMutationRequest(
        mutationRequest({
          host: "localhost:3000",
          origin: "https://attacker.example",
        }),
      ),
    ).toBe(false);
    expect(
      isTrustedMutationRequest(
        mutationRequest({
          host: "localhost:3000",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });
});

describe("bounded request bodies", () => {
  it("parses valid JSON within the limit", async () => {
    const request = new Request("http://localhost:3000/api/example", {
      method: "POST",
      body: JSON.stringify({ name: "Best Brain" }),
    });

    await expect(readBoundedJson(request, 128)).resolves.toEqual({
      name: "Best Brain",
    });
  });

  it("rejects an actual body larger than the declared application limit", async () => {
    const request = new Request("http://localhost:3000/api/example", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(256) }),
    });

    await expect(readBoundedJson(request, 64)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});

describe("local authentication backstop", () => {
  it("denies attempts beyond the fixed-window allowance and resets later", () => {
    const input = {
      scope: "test-login",
      identifier: crypto.randomUUID(),
      maxRequests: 2,
      windowSeconds: 60,
      now: 1_000,
    };

    expect(consumeLocalRateLimit(input).allowed).toBe(true);
    expect(consumeLocalRateLimit(input).allowed).toBe(true);
    expect(consumeLocalRateLimit(input).allowed).toBe(false);
    expect(consumeLocalRateLimit({ ...input, now: 61_000 }).allowed).toBe(true);
  });
});
