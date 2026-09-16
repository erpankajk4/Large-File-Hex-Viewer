import { ChunkManager, CHUNK_SIZE, MAX_CACHE_CHUNKS } from "./src/services/chunkManager.ts";
import { ApiService } from "./src/services/api.service.ts";

async function runChunkManagerTests() {
  console.log("==================================================");
  console.log("   Testing ChunkManager: Math, LRU & Deduplication ");
  console.log("==================================================");

  // Mock ApiService.fetchChunk to track calls and return deterministic data
  let fetchCallCount = 0;
  const mockFileSize = 10 * 1024 * 1024 * 1024; // 10 GB

  ApiService.fetchChunk = async (fileId, offset, length) => {
    fetchCallCount++;
    const buf = new Uint8Array(length);
    // Fill with predictable pattern based on offset
    for (let i = 0; i < length; i++) {
      buf[i] = (offset + i) % 256;
    }
    // Simulate tiny network delay
    await new Promise((resolve) => setTimeout(resolve, 5));
    return buf;
  };

  const cm = new ChunkManager("test-10gb.bin", mockFileSize);

  // Test 1: Chunk alignment math
  console.log("\n[Test 1] Aligned Chunk Index Math:");
  const testOffsets = [
    { offset: 0, expectedChunk: 0 },
    { offset: 65535, expectedChunk: 0 },
    { offset: 65536, expectedChunk: 1 },
    { offset: 131071, expectedChunk: 1 },
    { offset: 131072, expectedChunk: 2 },
    { offset: 4 * 1024 * 1024 * 1024, expectedChunk: 65536 } // 4 GB offset
  ];

  for (const { offset, expectedChunk } of testOffsets) {
    const chunkIdx = Math.floor(offset / CHUNK_SIZE);
    if (chunkIdx !== expectedChunk) {
      throw new Error(`Failed chunk math for offset ${offset}: expected ${expectedChunk}, got ${chunkIdx}`);
    }
    console.log(`  ✓ Offset ${offset.toString().padEnd(12)} -> Chunk Index ${chunkIdx}`);
  }

  // Test 2: In-Flight Request Deduplication (Coalescing)
  console.log("\n[Test 2] Request Coalescing (Concurrent Fetches):");
  fetchCallCount = 0;
  const [resA, resB, resC] = await Promise.all([
    cm.getChunk(5),
    cm.getChunk(5),
    cm.getChunk(5)
  ]);

  if (fetchCallCount !== 1) {
    throw new Error(`Expected exactly 1 network fetch for 3 concurrent requests, got ${fetchCallCount}`);
  }
  if (resA.length !== CHUNK_SIZE || resB.length !== CHUNK_SIZE) {
    throw new Error("Returned chunk size mismatch");
  }
  console.log(`  ✓ 3 concurrent requests coalesced into ${fetchCallCount} network fetch`);

  // Test 3: Cache Hit & LRU Promotion
  console.log("\n[Test 3] Cache Hit & Stats Tracking:");
  const initialHits = cm.getStats().hits;
  await cm.getChunk(5); // Should hit cache
  const afterHits = cm.getStats().hits;
  if (afterHits !== initialHits + 1) {
    throw new Error("Cache hit counter did not increment");
  }
  console.log(`  ✓ Repeated getChunk(5) was instant cache hit (hits: ${afterHits})`);

  // Test 4: Cross-Boundary Byte Range Slicing
  console.log("\n[Test 4] Cross-Boundary Range Slicing:");
  // Request 16 bytes starting 6 bytes before the chunk boundary:
  // Offset: 65530 to 65545 (spans Chunk 0 and Chunk 1)
  const crossBytes = await cm.getBytes(65530, 16);
  if (crossBytes.length !== 16) {
    throw new Error(`Expected 16 bytes across boundary, got ${crossBytes.length}`);
  }
  for (let i = 0; i < 16; i++) {
    const expectedByte = (65530 + i) % 256;
    if (crossBytes[i] !== expectedByte) {
      throw new Error(`Byte mismatch at index ${i}: expected ${expectedByte}, got ${crossBytes[i]}`);
    }
  }
  console.log(`  ✓ Seamlessly assembled 16 bytes spanning Chunk 0 (6 bytes) and Chunk 1 (10 bytes)`);

  // Test 5: Bounded LRU Eviction Under Pressure
  console.log("\n[Test 5] Bounded LRU Cache Eviction (Memory Cap):");
  cm.reset("test-10gb.bin", mockFileSize);

  // Fetch 150 chunks (exceeds MAX_CACHE_CHUNKS = 128)
  for (let i = 0; i < 150; i++) {
    await cm.getChunk(i);
  }

  const stats = cm.getStats();
  console.log(`  Total fetched: 150 chunks`);
  console.log(`  Cached chunks: ${stats.cachedChunks} (Max allowed: ${MAX_CACHE_CHUNKS})`);
  console.log(`  RAM in cache:  ${(stats.memoryBytes / (1024 * 1024)).toFixed(2)} MB`);

  if (stats.cachedChunks > MAX_CACHE_CHUNKS) {
    throw new Error(`LRU Cache exceeded max capacity! size = ${stats.cachedChunks}`);
  }
  console.log(`  ✓ Cache bounded strictly at ${stats.cachedChunks} chunks (~${(stats.memoryBytes / (1024 * 1024)).toFixed(2)} MB), zero memory leak!`);

  console.log("\n==================================================");
  console.log("   ALL CHUNK MANAGER UNIT TESTS PASSED!           ");
  console.log("==================================================");
}

runChunkManagerTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
