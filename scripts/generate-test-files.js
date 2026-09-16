import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Creates a realistic binary buffer mimicking forensic file headers
 * (mix of magic bytes, metadata strings, and structured numbers).
 */
function createRichHeaderBuffer() {
  const buf = Buffer.alloc(4096, 0); // 4 KB initial rich block

  // 1. Magic bytes & file header
  buf.write("FORENSIC_EVIDENCE_DUMP_V1.0\0", 0, "utf-8");

  // 2. Mock binary structures at specific offsets
  // Offset 0x0080 - zero padding
  // Offset 0x00A0 - metadata tag
  buf.write("photoshop:desc", 0x00a0, "utf-8");

  // Offset 0x00B0
  buf.write("..$rXYZ.......gXYZ", 0x00b0, "utf-8");

  // Offset 0x0130 - Reference forensic byte sequence
  // Row: 30 0C 73 00 52 00 47 00 42 58 59 5A 20 00 00 00
  const referenceRow = [
    0x30, 0x0c, 0x73, 0x00, 0x52, 0x00, 0x47, 0x00,
    0x42, 0x58, 0x59, 0x5a, 0x20, 0x00, 0x00, 0x00
  ];
  for (let i = 0; i < referenceRow.length; i++) {
    buf[0x0130 + i] = referenceRow[i];
  }

  // Offset 0x0200 - repeating printable ASCII block
  const testText = "The quick brown fox jumps over the lazy dog 0123456789!@#$%^&*()_+";
  buf.write(testText, 0x0200, "utf-8");

  // Offset 0x0300 - integer sequence (uint8, uint16, uint32)
  for (let i = 0; i < 64; i++) {
    buf[0x0300 + i] = (i * 7) % 256;
  }

  return buf;
}

/**
 * Creates a test file instantly using filesystem sparse allocation.
 *
 * - Writes actual bytes at offset 0 (header) and specific diagnostic markers.
 * - Uses ftruncateSync to set the logical file size to `sizeInBytes`.
 * - The OS allocates only the disk blocks that were written to,
 *   while unwritten ranges read back as zeros (0x00) without consuming physical drive space.
 */
function createTestFile(fileName, sizeInBytes) {
  const filePath = path.join(DATA_DIR, fileName);
  const fd = fs.openSync(filePath, "w");

  try {
    // 1. Write the rich header block at offset 0
    const header = createRichHeaderBuffer();
    const bytesToWrite = Math.min(header.length, sizeInBytes);
    fs.writeSync(fd, header, 0, bytesToWrite, 0);

    // 2. If file is large enough, write identifiable forensic markers at specific offsets
    if (sizeInBytes > 1024 * 1024) {
      // 1 MB marker
      const marker1Mb = Buffer.from("MARKER_AT_OFFSET_1MB___________________\n");
      fs.writeSync(fd, marker1Mb, 0, marker1Mb.length, 1024 * 1024);
    }

    if (sizeInBytes >= 1024 * 1024 * 1024) {
      // 1 GB marker
      const marker1Gb = Buffer.from("MARKER_AT_OFFSET_1GB_FORENSIC_SEEK_TEST\n");
      fs.writeSync(fd, marker1Gb, 0, marker1Gb.length, 1024 * 1024 * 1024);
    }

    if (sizeInBytes >= 4 * 1024 * 1024 * 1024) {
      // 4 GB marker (tests offsets above 32-bit unsigned integer limits)
      const marker4Gb = Buffer.from("MARKER_AT_OFFSET_4GB_BEYOND_32BIT_LIMIT\n");
      fs.writeSync(fd, marker4Gb, 0, marker4Gb.length, 4 * 1024 * 1024 * 1024);
    }

    // 3. Write EOF tail marker (last 64 bytes) so scrolling to the end is verifiable
    if (sizeInBytes > 128) {
      const tailOffset = sizeInBytes - 64;
      const tailMarker = Buffer.from("EOF_TAIL_SIGNATURE_END_OF_FORENSIC_FILE_DUMP_VERIFIED__________\n");
      fs.writeSync(fd, tailMarker, 0, Math.min(tailMarker.length, 64), tailOffset);
    }

    // 4. Truncate file descriptor to exact target size
    fs.ftruncateSync(fd, sizeInBytes);

    const stats = fs.statSync(filePath);
    const sizeDisplay =
      sizeInBytes >= 1024 * 1024 * 1024
        ? `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : sizeInBytes >= 1024 * 1024
        ? `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(sizeInBytes / 1024).toFixed(2)} KB`;

    console.log(`[OK] Created: ${fileName.padEnd(20)} | Logical Size: ${sizeDisplay.padStart(10)} (${stats.size} bytes)`);
  } finally {
    fs.closeSync(fd);
  }
}

console.log("==================================================");
console.log("   Large-File Hex Viewer — Test Data Generator   ");
console.log("==================================================");
console.log(`Target directory: ${DATA_DIR}\n`);

const startTime = Date.now();

// Generate test matrix
createTestFile("sample-tiny-10kb.bin", 10 * 1024);                     // 10 KB
createTestFile("sample-medium-50mb.bin", 50 * 1024 * 1024);           // 50 MB
createTestFile("sample-huge-1gb.bin", 1024 * 1024 * 1024);            // 1 GB
createTestFile("sample-extreme-10gb.bin", 10 * 1024 * 1024 * 1024);    // 10 GB (10,737,418,240 bytes)

const elapsed = Date.now() - startTime;
console.log(`\nAll test files successfully generated in ${elapsed} ms!`);
console.log("==================================================");
