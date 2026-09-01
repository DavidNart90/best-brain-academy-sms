const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function studentPhotoExtension(
  type: string,
  size: number,
  bytes: Uint8Array,
) {
  if (size < 1 || size > MAX_PHOTO_BYTES) return null;
  if (type === "image/jpeg" && startsWith(bytes, [0xff, 0xd8, 0xff]))
    return "jpg";
  if (
    type === "image/png" &&
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  )
    return "png";
  if (
    type === "image/webp" &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "webp";
  return null;
}
