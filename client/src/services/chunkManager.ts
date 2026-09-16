import { ApiService } from "./api.service.ts";
import type { CacheStats } from "../types/hex.types.ts";

/**
 * 64 KB per chunk.
 *
 * Sizing rationale:
 * - At 16 bytes per row, 64 KB provides 4,096 rows (~100 visible viewports on a typical screen).
 * - 64 KB transfers over localhost / network in < 2 ms.
 * - Substantially smaller sizes trigger excessive HTTP round-trips during fast scrolling.
 * - Substantially larger sizes increase random seek latency and waste bandwidth for small views.
 */
export const CHUNK_SIZE = 65536; // 64 KB

/**
 * Maximum chunks in RAM before LRU eviction.
 * 128 chunks * 64 KB = 8.19 MB maximum in-memory cache footprint,
 * ensuring flat memory consumption regardless of total file size.
 */
export const MAX_CACHE_CHUNKS = 128;

interface CacheEntry {
  data: Uint8Array;
  chunkIndex: number;
}

export class ChunkManager {
  private fileId: string;
  private fileSize: number;

  // LRU Cache: JS Map preserves insertion order.
  // Oldest = cache.keys().next().value (Least Recently Used)
  // Newest = last inserted key (Most Recently Used)
  private cache: Map<number, CacheEntry> = new Map();

  // In-flight request coalescing (prevents duplicate HTTP fetches)
  private inFlightRequests: Map<number, Promise<Uint8Array>> = new Map();

  // Telemetry metrics
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(fileId: string, fileSize: number) {
    this.fileId = fileId;
    this.fileSize = fileSize;
  }

  /**
   * Resets the cache for a new file.
   */
  public reset(newFileId: string, newFileSize: number): void {
    this.fileId = newFileId;
    this.fileSize = newFileSize;
    this.cache.clear();
    this.inFlightRequests.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Returns telemetry stats on cache hits, misses, and memory usage.
   */
  public getStats(): CacheStats {
    let memoryBytes = 0;
    for (const entry of this.cache.values()) {
      memoryBytes += entry.data.byteLength;
    }

    return {
      cachedChunks: this.cache.size,
      maxChunks: MAX_CACHE_CHUNKS,
      memoryBytes,
      hits: this.hitCount,
      misses: this.missCount,
      inFlight: this.inFlightRequests.size,
    };
  }

  /**
   * Loads an aligned 64 KB chunk by chunk index.
   * Handles cache hits, LRU promotion, deduplication, and LRU eviction.
   */
  public async getChunk(chunkIndex: number): Promise<Uint8Array> {
    const chunkStartOffset = chunkIndex * CHUNK_SIZE;

    // Out of bounds check
    if (chunkStartOffset >= this.fileSize) {
      return new Uint8Array(0);
    }

    // 1. Cache Hit (O(1) lookup)
    if (this.cache.has(chunkIndex)) {
      this.hitCount++;
      const entry = this.cache.get(chunkIndex)!;

      // LRU Promotion: Re-insert to move to the end (MRU)
      this.cache.delete(chunkIndex);
      this.cache.set(chunkIndex, entry);

      return entry.data;
    }

    // 2. Cache Miss
    this.missCount++;

    // Check if an identical request is already in-flight (Request Coalescing)
    if (this.inFlightRequests.has(chunkIndex)) {
      return this.inFlightRequests.get(chunkIndex)!;
    }

    // Clamp length so we don't request past EOF
    const chunkLength = Math.min(CHUNK_SIZE, this.fileSize - chunkStartOffset);

    // 3. Dispatch single network fetch
    const fetchPromise = (async () => {
      try {
        const data = await ApiService.fetchChunk(this.fileId, chunkStartOffset, chunkLength);

        // LRU Eviction: If cache is full, delete the oldest item (first key in Map)
        if (this.cache.size >= MAX_CACHE_CHUNKS) {
          const oldestChunkIndex = this.cache.keys().next().value;
          if (oldestChunkIndex !== undefined) {
            this.cache.delete(oldestChunkIndex);
          }
        }

        // Store new entry at MRU position
        this.cache.set(chunkIndex, {
          data,
          chunkIndex,
        });

        return data;
      } finally {
        this.inFlightRequests.delete(chunkIndex);
      }
    })();

    this.inFlightRequests.set(chunkIndex, fetchPromise);
    return fetchPromise;
  }

  /**
   * Slices arbitrary byte ranges across chunk boundaries.
   *
   * Example:
   * Reading 16 bytes starting at offset 65530 spans:
   * - Chunk 0: bytes 65530..65535 (6 bytes)
   * - Chunk 1: bytes 65536..65545 (10 bytes)
   * This method fetches both chunks and concatenates the exact slice seamlessly.
   */
  public async getBytes(offset: number, length: number): Promise<Uint8Array> {
    if (this.fileSize === 0 || offset >= this.fileSize || length <= 0) {
      return new Uint8Array(0);
    }

    const clampedLength = Math.min(length, this.fileSize - offset);
    const result = new Uint8Array(clampedLength);

    const startChunkIndex = Math.floor(offset / CHUNK_SIZE);
    const endChunkIndex = Math.floor((offset + clampedLength - 1) / CHUNK_SIZE);

    let resultOffset = 0;

    for (let cIdx = startChunkIndex; cIdx <= endChunkIndex; cIdx++) {
      const chunkData = await this.getChunk(cIdx);
      const chunkStartOffset = cIdx * CHUNK_SIZE;

      // Calculate the slice boundaries within this specific chunk
      const sliceStartInChunk = Math.max(0, offset - chunkStartOffset);
      const sliceEndInChunk = Math.min(
        chunkData.byteLength,
        offset + clampedLength - chunkStartOffset
      );

      const bytesToCopy = sliceEndInChunk - sliceStartInChunk;
      if (bytesToCopy > 0) {
        const chunkSlice = chunkData.subarray(sliceStartInChunk, sliceEndInChunk);
        result.set(chunkSlice, resultOffset);
        resultOffset += bytesToCopy;
      }
    }

    // Opportunistic Read-Ahead: Trigger background prefetch of the next chunk
    const nextChunkIndex = endChunkIndex + 1;
    if (nextChunkIndex * CHUNK_SIZE < this.fileSize && !this.cache.has(nextChunkIndex)) {
      this.getChunk(nextChunkIndex).catch(() => {
        // Silently ignore prefetch errors
      });
    }

    return result;
  }
}
