import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { BytesPerRow } from "../types/hex.types.ts";

/**
 * Maximum height in pixels for the virtual scroll spacer.
 *
 * Handling browser CSS element height limits:
 * - Browsers enforce a maximum element height (~16.7M - 33.5M pixels).
 * - Multi-gigabyte files (e.g. 10 GB = 671,088,640 rows @ 24px/row = 16.1 billion px)
 *   would exceed this ceiling and cause clipping or scroll failures.
 * - We clamp the spacer to MAX_VIRTUAL_HEIGHT (6,000,000 px).
 * - Native scrollbar thumb dragging maps normalized percentage (scrollTop / maxScrollTop)
 *   to startRowIndex in O(1) time.
 * - Wheel and arrow keys adjust startRowIndex directly by integer row deltas.
 */
export const MAX_VIRTUAL_HEIGHT = 6_000_000;
export const DEFAULT_ROW_HEIGHT = 24; // 24px per row (crisp monospace alignment)

interface UseVirtualScrollOptions {
  fileSize: number;
  bytesPerRow: BytesPerRow;
  rowHeight?: number;
  viewportHeight: number;
  overscan?: number;
}

export function useVirtualScroll({
  fileSize,
  bytesPerRow,
  rowHeight = DEFAULT_ROW_HEIGHT,
  viewportHeight,
  overscan = 4,
}: UseVirtualScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);

  // Total rows in the entire file
  const totalRows = useMemo(() => {
    if (fileSize <= 0) return 0;
    return Math.ceil(fileSize / bytesPerRow);
  }, [fileSize, bytesPerRow]);

  // How many rows fit inside the visible viewport
  const visibleRowCount = useMemo(() => {
    if (viewportHeight <= 0) return 30;
    return Math.ceil(viewportHeight / rowHeight);
  }, [viewportHeight, rowHeight]);

  // Max row index that can be at the top of the viewport
  const maxStartRowIndex = useMemo(() => {
    return Math.max(0, totalRows - visibleRowCount);
  }, [totalRows, visibleRowCount]);

  // Virtual spacer height (clamped to MAX_VIRTUAL_HEIGHT)
  const { virtualHeight, isScaled } = useMemo(() => {
    const rawHeight = totalRows * rowHeight;
    if (rawHeight <= MAX_VIRTUAL_HEIGHT) {
      return { virtualHeight: Math.max(rawHeight, viewportHeight), isScaled: false };
    }
    return { virtualHeight: MAX_VIRTUAL_HEIGHT, isScaled: true };
  }, [totalRows, rowHeight, viewportHeight]);

  // Max scrollTop for the scrollable container
  const maxScrollTop = useMemo(() => {
    return Math.max(1, virtualHeight - viewportHeight);
  }, [virtualHeight, viewportHeight]);

  // Synchronize scrollbar position when startRowIndex is adjusted programmatically
  const syncScrollTopFromRow = useCallback(
    (rowIndex: number) => {
      if (!scrollContainerRef.current) return;
      const clampedRow = Math.max(0, Math.min(rowIndex, maxStartRowIndex));
      if (maxStartRowIndex === 0) {
        scrollContainerRef.current.scrollTop = 0;
        return;
      }

      if (isScaled) {
        const ratio = clampedRow / maxStartRowIndex;
        scrollContainerRef.current.scrollTop = Math.round(ratio * maxScrollTop);
      } else {
        scrollContainerRef.current.scrollTop = clampedRow * rowHeight;
      }
    },
    [maxStartRowIndex, isScaled, maxScrollTop, rowHeight]
  );

  /**
   * Handles native scroll events (e.g. scrollbar drag).
   */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const currentScrollTop = e.currentTarget.scrollTop;

      if (maxStartRowIndex === 0) {
        setStartRowIndex(0);
        return;
      }

      if (isScaled) {
        // Normalized scroll ratio mapping
        const ratio = Math.min(1, Math.max(0, currentScrollTop / maxScrollTop));
        const computedRow = Math.floor(ratio * maxStartRowIndex);
        setStartRowIndex(computedRow);
      } else {
        const computedRow = Math.floor(currentScrollTop / rowHeight);
        setStartRowIndex(Math.min(computedRow, maxStartRowIndex));
      }
    },
    [isScaled, maxScrollTop, maxStartRowIndex, rowHeight]
  );

  /**
   * Direct high-precision wheel scrolling.
   * Modifies row index directly without pixel truncation.
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (maxStartRowIndex === 0) return;

      // Prevent default page scroll and handle row delta
      e.preventDefault();
      const rowsToScroll = Math.sign(e.deltaY) * (e.shiftKey ? 10 : 3);
      setStartRowIndex((prev) => {
        const nextRow = Math.max(0, Math.min(prev + rowsToScroll, maxStartRowIndex));
        syncScrollTopFromRow(nextRow);
        return nextRow;
      });
    },
    [maxStartRowIndex, syncScrollTopFromRow]
  );

  /**
   * Instantly jumps to any byte offset in the file in O(1) time.
   */
  const scrollToOffset = useCallback(
    (byteOffset: number) => {
      const targetRow = Math.floor(byteOffset / bytesPerRow);
      const clampedRow = Math.max(0, Math.min(targetRow, maxStartRowIndex));
      setStartRowIndex(clampedRow);
      syncScrollTopFromRow(clampedRow);
    },
    [bytesPerRow, maxStartRowIndex, syncScrollTopFromRow]
  );

  /**
   * Jumps to a specific row index.
   */
  const scrollToRow = useCallback(
    (targetRow: number) => {
      const clampedRow = Math.max(0, Math.min(targetRow, maxStartRowIndex));
      setStartRowIndex(clampedRow);
      syncScrollTopFromRow(clampedRow);
    },
    [maxStartRowIndex, syncScrollTopFromRow]
  );

  // Generate the active array of row indices to render (with overscan)
  const renderedRowIndices = useMemo(() => {
    const start = Math.max(0, startRowIndex - overscan);
    const end = Math.min(totalRows, startRowIndex + visibleRowCount + overscan);
    const indices: number[] = [];
    for (let i = start; i < end; i++) {
      indices.push(i);
    }
    return indices;
  }, [startRowIndex, overscan, visibleRowCount, totalRows]);

  // Reset scroll on file change
  useEffect(() => {
    setStartRowIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [fileSize, bytesPerRow]);

  return {
    scrollContainerRef,
    startRowIndex,
    totalRows,
    visibleRowCount,
    renderedRowIndices,
    virtualHeight,
    isScaled,
    handleScroll,
    handleWheel,
    scrollToOffset,
    scrollToRow,
  };
}
