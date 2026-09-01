export const SCHOOL_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function isValidSchoolLogo(
  type: string,
  size: number,
  bytes: Uint8Array,
) {
  if (type !== "image/png" || size < 33 || size > SCHOOL_LOGO_MAX_BYTES)
    return false;
  if (!startsWith(bytes, pngSignature)) return false;
  if (!startsWith(bytes, [0x49, 0x48, 0x44, 0x52], 12)) return false;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);

  return (
    width >= 128 &&
    height >= 128 &&
    width <= 4096 &&
    height <= 4096 &&
    width * height <= 16_777_216
  );
}
