import "server-only";

import { createHash } from "node:crypto";
import { isSameOriginAsHost } from "@/lib/auth/origin";

export class RequestBodyTooLargeError extends Error {}

export class InvalidRequestBodyError extends Error {}

export function isTrustedMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && (!host || !isSameOriginAsHost(origin, host))) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

export function hasContentType(request: Request, expected: string) {
  return request.headers
    .get("content-type")
    ?.toLowerCase()
    .startsWith(expected.toLowerCase());
}

function declaredLengthWithinLimit(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (value === null) return true;
  if (!/^\d{1,12}$/.test(value)) return false;
  return Number(value) <= maxBytes;
}

async function readBoundedBody(request: Request, maxBytes: number) {
  if (!declaredLengthWithinLimit(request, maxBytes))
    throw new RequestBodyTooLargeError();
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedJson(request: Request, maxBytes: number) {
  const bytes = await readBoundedBody(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new InvalidRequestBodyError();
  }
}

export async function readBoundedFormData(request: Request, maxBytes: number) {
  const bytes = await readBoundedBody(request, maxBytes);
  try {
    return await new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bytes,
    }).formData();
  } catch {
    throw new InvalidRequestBodyError();
  }
}

type LocalWindow = {
  count: number;
  startedAt: number;
};

const localWindows = new Map<string, LocalWindow>();

export function consumeLocalRateLimit({
  scope,
  identifier,
  maxRequests,
  windowSeconds,
  now = Date.now(),
}: {
  scope: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
  now?: number;
}) {
  const key = createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex");
  const windowMs = windowSeconds * 1000;
  const existing = localWindows.get(key);
  const window =
    !existing || existing.startedAt + windowMs <= now
      ? { count: 1, startedAt: now }
      : { ...existing, count: existing.count + 1 };
  localWindows.set(key, window);

  if (localWindows.size > 5_000) {
    for (const [entryKey, entry] of localWindows) {
      if (entry.startedAt + windowMs <= now) localWindows.delete(entryKey);
    }
  }

  return {
    allowed: window.count <= maxRequests,
    remaining: Math.max(maxRequests - window.count, 0),
    retryAfter: Math.max(
      1,
      Math.ceil((window.startedAt + windowMs - now) / 1000),
    ),
  };
}
