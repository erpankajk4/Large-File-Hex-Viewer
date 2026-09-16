export type BytesPerRow = 8 | 16 | 32;

export interface SelectionRange {
  start: number;
  end: number;
}

export interface EndianInspection {
  uint16: number | null;
  uint32: number | null;
  uint64: string | null; // Stored as string to preserve 64-bit precision
}

export interface InspectedByte {
  offset: number;
  hex: string;
  ascii: string;
  uint8: number;
  littleEndian: EndianInspection;
  bigEndian: EndianInspection;
}

export interface CacheStats {
  cachedChunks: number;
  maxChunks: number;
  memoryBytes: number;
  hits: number;
  misses: number;
  inFlight: number;
}
