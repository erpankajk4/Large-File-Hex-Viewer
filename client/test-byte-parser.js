import { parseByteInspector } from "./src/services/byteParser.ts";

function testByteParser() {
  console.log("==================================================");
  console.log("   Testing ByteParser: Endianness & 64-bit BigInt ");
  console.log("==================================================");

  // 1. Exact byte pattern from reference test vector:
  // Offset 0x0130, byte 4 is 0x52 ('R')
  // Slice: 52 00 47 00 42 58 59 5A
  const referenceBytes = new Uint8Array([
    0x52, 0x00, 0x47, 0x00, 0x42, 0x58, 0x59, 0x5a
  ]);

  const result = parseByteInspector(referenceBytes, 308, 10000);

  console.log("\n[Test 1] Matching Reference Test Vector Values:");
  console.log(`  Selected Byte:      0x${result.hex} ('${result.ascii}') | uint8 = ${result.uint8}`);
  console.log(`  Little-Endian:`);
  console.log(`    - uint16:         ${result.littleEndian.uint16} (Expected: 82)`);
  console.log(`    - uint32:         ${result.littleEndian.uint32} (Expected: 4653138)`);
  console.log(`    - uint64:         ${result.littleEndian.uint64} (Expected: 6510331776836501586)`);

  console.log(`  Big-Endian:`);
  console.log(`    - uint16:         ${result.bigEndian.uint16} (Expected: 20992)`);
  console.log(`    - uint32:         ${result.bigEndian.uint32} (Expected: 1375749888)`);
  console.log(`    - uint64:         ${result.bigEndian.uint64} (Expected: 5908800777548749146)`);

  // Assertions against screenshot values
  if (result.hex !== "52") throw new Error("Hex mismatch");
  if (result.ascii !== "R") throw new Error("ASCII mismatch");
  if (result.uint8 !== 82) throw new Error("uint8 mismatch");

  if (result.littleEndian.uint16 !== 82) throw new Error("LE uint16 mismatch");
  if (result.littleEndian.uint32 !== 4653138) throw new Error("LE uint32 mismatch");
  if (result.littleEndian.uint64 !== "6510331776836501586") throw new Error("LE uint64 mismatch");

  if (result.bigEndian.uint16 !== 20992) throw new Error("BE uint16 mismatch");
  if (result.bigEndian.uint32 !== 1375749888) throw new Error("BE uint32 mismatch");
  if (result.bigEndian.uint64 !== "5908800777548749146") throw new Error("BE uint64 mismatch");

  console.log("  ✓ All reference values match 100%!");

  // 2. Test End of File (EOF) safety
  console.log("\n[Test 2] End-of-File (EOF) Bounds Safety:");
  // Only 3 bytes remaining at offset 997 of 1000 byte file
  const eofBytes = new Uint8Array([0x01, 0x02, 0x03]);
  const eofResult = parseByteInspector(eofBytes, 997, 1000);

  if (eofResult.littleEndian.uint16 === null) throw new Error("uint16 should not be null for 3 bytes");
  if (eofResult.littleEndian.uint32 !== null) throw new Error("uint32 must be null when only 3 bytes remain");
  if (eofResult.littleEndian.uint64 !== null) throw new Error("uint64 must be null when only 3 bytes remain");

  console.log(`  ✓ uint16: ${eofResult.littleEndian.uint16} | uint32: ${eofResult.littleEndian.uint32} (null) | uint64: ${eofResult.littleEndian.uint64} (null)`);
  console.log("  ✓ Bounds safety confirmed: no out-of-bounds exceptions at EOF!");

  // 3. Test Subarray byteOffset handling
  console.log("\n[Test 3] Subarray byteOffset Handling:");
  const parentBuf = new Uint8Array([0xAA, 0xBB, 0x52, 0x00, 0x47, 0x00, 0x42, 0x58, 0x59, 0x5A]);
  const subSlice = parentBuf.subarray(2, 10); // Starts at 0x52
  const subResult = parseByteInspector(subSlice, 308, 10000);

  if (subResult.littleEndian.uint32 !== 4653138) {
    throw new Error("Subarray byteOffset was not handled correctly by DataView");
  }
  console.log("  ✓ Subarray slice parsed correctly with proper DataView byteOffset!");

  console.log("\n==================================================");
  console.log("   ALL BYTE PARSER TESTS PASSED 100%!             ");
  console.log("==================================================");
}

testByteParser();
