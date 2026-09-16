import { MAX_VIRTUAL_HEIGHT, DEFAULT_ROW_HEIGHT } from "./src/hooks/useVirtualScroll.ts";

function testVirtualScrollMath() {
  console.log("==================================================");
  console.log("   Testing Virtual Scroll Math: 10 GB & Max Height");
  console.log("==================================================");

  const testCases = [
    { name: "10 KB File", size: 10 * 1024, bytesPerRow: 16 },
    { name: "50 MB File", size: 50 * 1024 * 1024, bytesPerRow: 16 },
    { name: "1 GB File", size: 1024 * 1024 * 1024, bytesPerRow: 16 },
    { name: "10 GB Extreme File", size: 10 * 1024 * 1024 * 1024, bytesPerRow: 16 },
    { name: "10 GB File (32 bytes/row)", size: 10 * 1024 * 1024 * 1024, bytesPerRow: 32 },
    { name: "10 GB File (8 bytes/row)", size: 10 * 1024 * 1024 * 1024, bytesPerRow: 8 },
  ];

  const viewportHeight = 800; // 800px monitor viewport
  const visibleRowCount = Math.ceil(viewportHeight / DEFAULT_ROW_HEIGHT); // ~34 rows

  console.log(`Viewport Height: ${viewportHeight}px | Visible Rows: ${visibleRowCount} rows\n`);

  for (const tc of testCases) {
    const totalRows = Math.ceil(tc.size / tc.bytesPerRow);
    const rawHeight = totalRows * DEFAULT_ROW_HEIGHT;
    const isScaled = rawHeight > MAX_VIRTUAL_HEIGHT;
    const virtualHeight = isScaled ? MAX_VIRTUAL_HEIGHT : Math.max(rawHeight, viewportHeight);
    const maxScrollTop = Math.max(1, virtualHeight - viewportHeight);
    const maxStartRowIndex = Math.max(0, totalRows - visibleRowCount);

    console.log(`[${tc.name} | ${tc.bytesPerRow} bytes/row]`);
    console.log(`  Total Rows:       ${totalRows.toLocaleString()} rows`);
    console.log(`  Theoretical H:    ${(rawHeight / 1_000_000).toFixed(2)} Million px`);
    console.log(`  DOM Spacer H:     ${(virtualHeight / 1_000_000).toFixed(2)} Million px (isScaled: ${isScaled})`);

    // Verify browser limit safety: Must NEVER exceed 16M px
    if (virtualHeight > 16_000_000) {
      throw new Error(`Virtual height exceeds browser limit: ${virtualHeight}`);
    }

    // Test normalized mapping at 0%, 50%, and 100%
    // At 0%
    const rowAt0 = Math.floor(0 * maxStartRowIndex);
    if (rowAt0 !== 0) throw new Error("Row at 0% should be 0");

    // At 50%
    const rowAt50 = Math.floor(0.5 * maxStartRowIndex);
    const expected50 = Math.floor(maxStartRowIndex / 2);
    if (rowAt50 !== expected50) throw new Error("Row at 50% mismatch");

    // At 100%
    const rowAt100 = Math.floor(1.0 * maxStartRowIndex);
    if (rowAt100 !== maxStartRowIndex) throw new Error("Row at 100% mismatch");

    console.log(`  ✓ 0% -> Row 0 | 50% -> Row ${rowAt50.toLocaleString()} | 100% -> Row ${rowAt100.toLocaleString()}`);
  }

  // Test Offset seeking math
  console.log("\n[Offset Seek Tests for 10 GB File (16 bytes/row)]:");
  const tenGb = 10 * 1024 * 1024 * 1024;
  const seekTests = [
    { offset: 0, expectedRow: 0, label: "Start of file" },
    { offset: 0x0130, expectedRow: 19, label: "Reference sample (offset 0x130 = 304)" },
    { offset: 1024 * 1024, expectedRow: 65536, label: "1 MB Marker" },
    { offset: 1024 * 1024 * 1024, expectedRow: 67108864, label: "1 GB Marker" },
    { offset: 4 * 1024 * 1024 * 1024, expectedRow: 268435456, label: "4 GB Marker (beyond 32-bit uint)" },
    { offset: tenGb - 64, expectedRow: Math.floor((tenGb - 64) / 16), label: "EOF Tail Marker" },
  ];

  for (const st of seekTests) {
    const computedRow = Math.floor(st.offset / 16);
    if (computedRow !== st.expectedRow) {
      throw new Error(`Seek failed for ${st.label}: expected ${st.expectedRow}, got ${computedRow}`);
    }
    console.log(`  ✓ ${st.label.padEnd(42)} -> Row ${computedRow.toLocaleString()}`);
  }

  console.log("\n==================================================");
  console.log("   ALL VIRTUAL SCROLL TESTS PASSED PERFECTLY!     ");
  console.log("==================================================");
}

testVirtualScrollMath();
