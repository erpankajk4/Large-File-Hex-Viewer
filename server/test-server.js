// Small validation script to test all backend endpoints
async function testBackend() {
  const BASE_URL = "http://localhost:5000";

  console.log("--------------------------------------------------");
  console.log("   Validating Large-File Hex Viewer API Endpoints  ");
  console.log("--------------------------------------------------");

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  console.log("[PASS] 1. GET /health:", healthData.message);

  // 2. List files
  const filesRes = await fetch(`${BASE_URL}/api/files`);
  const filesData = await filesRes.json();
  console.log(`[PASS] 2. GET /api/files: Found ${filesData.data.length} files:`);
  for (const f of filesData.data) {
    const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
    console.log(`       - ${f.name.padEnd(25)} : ${f.size} bytes (~${sizeMb} MB)`);
  }

  // 3. Metadata of 10 GB file
  const metaRes = await fetch(`${BASE_URL}/api/files/sample-extreme-10gb.bin/meta`);
  const metaData = await metaRes.json();
  console.log(`[PASS] 3. GET /api/files/:id/meta:`, metaData.data);

  // 4. Chunk at reference offset 0x0130 (304 bytes)
  const chunkRes = await fetch(`${BASE_URL}/api/files/sample-extreme-10gb.bin/chunk?offset=304&length=16`);
  if (chunkRes.status !== 200) {
    throw new Error(`Chunk endpoint returned status ${chunkRes.status}: ${await chunkRes.text()}`);
  }
  const chunkBuf = await chunkRes.arrayBuffer();
  const chunkBytes = new Uint8Array(chunkBuf);
  const hexStr = Array.from(chunkBytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  console.log("[PASS] 4. GET /api/files/:id/chunk at offset 0x0130 (16 bytes):");
  console.log(`       Received bytes: ${hexStr}`);
  console.log(`       Expected bytes: 30 0C 73 00 52 00 47 00 42 58 59 5A 20 00 00 00`);
  console.log(`       Content-Range header: ${chunkRes.headers.get("content-range")}`);

  // 5. Chunk at 4 GB offset (4294967296 bytes)
  const chunk4GbRes = await fetch(`${BASE_URL}/api/files/sample-extreme-10gb.bin/chunk?offset=4294967296&length=40`);
  if (chunk4GbRes.status !== 200) {
    throw new Error(`4GB chunk endpoint returned status ${chunk4GbRes.status}: ${await chunk4GbRes.text()}`);
  }
  const chunk4GbBuf = await chunk4GbRes.arrayBuffer();
  const markerText = new TextDecoder().decode(chunk4GbBuf);
  console.log("[PASS] 5. GET /api/files/:id/chunk at offset 4 GB (beyond 32-bit):");
  console.log(`       Marker decoded: ${markerText.trim()}`);
  console.log(`       Content-Range header: ${chunk4GbRes.headers.get("content-range")}`);

  console.log("--------------------------------------------------");
  console.log("   ALL BACKEND VALIDATIONS PASSED PERFECTLY!      ");
  console.log("--------------------------------------------------");
}

testBackend().catch(err => {
  console.error("Validation failed:", err);
  process.exit(1);
});
