import { useState, useEffect, useRef } from "react";
import type { ChunkManager } from "../services/chunkManager.ts";
import type { BytesPerRow } from "../types/hex.types.ts";

interface UseVisibleBytesOptions {
  chunkManager: ChunkManager | null;
  renderedRowIndices: number[];
  bytesPerRow: BytesPerRow;
  fileSize: number;
}

export function useVisibleBytes({
  chunkManager,
  renderedRowIndices,
  bytesPerRow,
  fileSize,
}: UseVisibleBytesOptions) {
  const [rowBytesMap, setRowBytesMap] = useState<Map<number, Uint8Array>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!chunkManager || renderedRowIndices.length === 0 || fileSize === 0) {
      setRowBytesMap(new Map());
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    const minRow = renderedRowIndices[0];
    const maxRow = renderedRowIndices[renderedRowIndices.length - 1];

    const startOffset = minRow * bytesPerRow;
    const totalBytesToFetch = Math.min(
      (maxRow - minRow + 1) * bytesPerRow,
      fileSize - startOffset
    );

    if (totalBytesToFetch <= 0) {
      setRowBytesMap(new Map());
      return;
    }

    setIsLoading(true);

    chunkManager
      .getBytes(startOffset, totalBytesToFetch)
      .then((combinedBuffer) => {
        // Drop result if a newer scroll request was fired
        if (currentRequestId !== requestIdRef.current) return;

        const newMap = new Map<number, Uint8Array>();
        for (const rIdx of renderedRowIndices) {
          const rowStart = (rIdx - minRow) * bytesPerRow;
          if (rowStart < combinedBuffer.byteLength) {
            const rowEnd = Math.min(rowStart + bytesPerRow, combinedBuffer.byteLength);
            newMap.set(rIdx, combinedBuffer.subarray(rowStart, rowEnd));
          }
        }

        setRowBytesMap(newMap);
        setIsLoading(false);
      })
      .catch((err) => {
        if (currentRequestId === requestIdRef.current) {
          console.error("[useVisibleBytes] Error loading row slice:", err);
          setIsLoading(false);
        }
      });
  }, [chunkManager, renderedRowIndices, bytesPerRow, fileSize]);

  return { rowBytesMap, isLoading };
}
