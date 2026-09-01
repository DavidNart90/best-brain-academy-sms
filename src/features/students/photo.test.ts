import { describe, expect, it } from "vitest";
import { studentPhotoExtension } from "./photo";

describe("studentPhotoExtension", () => {
  it("accepts matching image signatures", () => {
    expect(
      studentPhotoExtension(
        "image/png",
        8,
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("png");
  });

  it("rejects spoofed and oversized files", () => {
    expect(
      studentPhotoExtension("image/jpeg", 3, new Uint8Array([1, 2, 3])),
    ).toBeNull();
    expect(
      studentPhotoExtension(
        "image/jpeg",
        5 * 1024 * 1024 + 1,
        new Uint8Array([0xff, 0xd8, 0xff]),
      ),
    ).toBeNull();
  });
});
