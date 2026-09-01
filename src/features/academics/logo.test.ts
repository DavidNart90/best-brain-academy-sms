import { describe, expect, it } from "vitest";
import { isValidSchoolLogo, SCHOOL_LOGO_MAX_BYTES } from "./logo";

function pngHeader(width = 512, height = 512) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("isValidSchoolLogo", () => {
  it("accepts a PNG with safe dimensions and size", () => {
    const bytes = pngHeader();
    expect(isValidSchoolLogo("image/png", bytes.byteLength, bytes)).toBe(true);
  });

  it("rejects a spoofed MIME type and unsafe dimensions", () => {
    const bytes = pngHeader(5000, 512);
    expect(isValidSchoolLogo("image/jpeg", bytes.byteLength, bytes)).toBe(
      false,
    );
    expect(isValidSchoolLogo("image/png", bytes.byteLength, bytes)).toBe(false);
  });

  it("rejects an oversized payload", () => {
    const bytes = pngHeader();
    expect(
      isValidSchoolLogo("image/png", SCHOOL_LOGO_MAX_BYTES + 1, bytes),
    ).toBe(false);
  });
});
