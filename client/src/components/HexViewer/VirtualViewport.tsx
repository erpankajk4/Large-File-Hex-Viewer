import React, { useRef, useState, useEffect } from "react";
import { useVirtualScroll, DEFAULT_ROW_HEIGHT } from "../../hooks/useVirtualScroll.ts";
import type { BytesPerRow } from "../../types/hex.types.ts";

interface VirtualViewportProps {
  fileSize: number;
  bytesPerRow: BytesPerRow;
  rowHeight?: number;
  children: (params: {
    renderedRowIndices: number[];
    startRowIndex: number;
    totalRows: number;
    scrollToOffset: (offset: number) => void;
  }) => React.ReactNode;
}

/**
 * VirtualViewport:
 * Manages the virtual scroll container, solves the browser max element height constraint,
 * and maintains a completely flat DOM footprint (~40 rows rendered at any time).
 */
export function VirtualViewport({
  fileSize,
  bytesPerRow,
  rowHeight = DEFAULT_ROW_HEIGHT,
  children,
}: VirtualViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(600);

  // ResizeObserver to measure actual visible height dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const {
    scrollContainerRef,
    startRowIndex,
    totalRows,
    renderedRowIndices,
    virtualHeight,
    handleScroll,
    handleWheel,
    scrollToOffset,
  } = useVirtualScroll({
    fileSize,
    bytesPerRow,
    rowHeight,
    viewportHeight,
    overscan: 4,
  });

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        scrollContainerRef.current = el;
      }}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="relative flex-1 h-full w-full overflow-y-scroll overflow-x-hidden focus:outline-none bg-neutral-950 font-mono text-xs leading-none"
      tabIndex={0}
    >
      {/* Virtual Scroll Track Spacer: Expands container scrollHeight to virtualHeight */}
      <div
        style={{ height: `${virtualHeight}px`, width: "100%", position: "relative" }}
      >
        {/* Sticky Active Viewport: Stays pinned to the visible viewport as user scrolls */}
        <div className="sticky top-0 left-0 w-full pointer-events-auto flex flex-col justify-start">
          {children({
            renderedRowIndices,
            startRowIndex,
            totalRows,
            scrollToOffset,
          })}
        </div>
      </div>
    </div>
  );
}
