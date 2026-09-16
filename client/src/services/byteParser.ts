import type { InspectedByte, EndianInspection } from "../types/hex.types.ts";

/**
 * Parses raw bytes into Little-Endian and Big-Endian integers with high precision.
 *
 * Implementation notes:
 * 1. Precision: JavaScript `Number` is an IEEE-754 double precision float which
 *    loses precision above 2^53 - 1. To accurately parse 64-bit integers,
 *    we use `view.getBigUint64()` and stringify.
 * 2. Endianness:
 *    - Little-Endian: Least significant byte stored first.
 *    - Big-Endian: Most significant byte stored first.
 * 3. Bounds safety: If a byte at EOF does not have sufficient consecutive
 *    bytes for uint16/uint32/uint64, returns `null` to avoid out-of-bounds exceptions.
 */
export function parseByteInspector(
  bytes: Uint8Array,
  offset: number,
  fileSize: number
): InspectedByte {
  const byteCount = bytes.length;
  const remaining = fileSize - offset;

  const hex =
    byteCount > 0 ? bytes[0].toString(16).toUpperCase().padStart(2, "0") : "··";
  const uint8 = byteCount > 0 ? bytes[0] : 0;
  const ascii =
    byteCount > 0 && bytes[0] >= 0x20 && bytes[0] <= 0x7e
      ? String.fromCharCode(bytes[0])
      : ".";

  // Create DataView over the underlying buffer
  // Note: bytes can be a subarray, so we pass byteOffset and byteLength explicitly
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const littleEndian: EndianInspection = {
    uint16: remaining >= 2 && byteCount >= 2 ? view.getUint16(0, true) : null,
    uint32: remaining >= 4 && byteCount >= 4 ? view.getUint32(0, true) : null,
    uint64:
      remaining >= 8 && byteCount >= 8
        ? view.getBigUint64(0, true).toString()
        : null,
  };

  const bigEndian: EndianInspection = {
    uint16: remaining >= 2 && byteCount >= 2 ? view.getUint16(0, false) : null,
    uint32: remaining >= 4 && byteCount >= 4 ? view.getUint32(0, false) : null,
    uint64:
      remaining >= 8 && byteCount >= 8
        ? view.getBigUint64(0, false).toString()
        : null,
  };

  return {
    offset,
    hex,
    ascii,
    uint8,
    littleEndian,
    bigEndian,
  };
}
