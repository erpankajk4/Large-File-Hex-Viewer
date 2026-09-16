import React, { useMemo } from "react";
import { VirtualViewport } from "./VirtualViewport.tsx";
import { HexRow } from "./HexRow.tsx";
import { useVisibleBytes } from "../../hooks/useVisibleBytes.ts";
import { useHexSelection } from "../../hooks/useHexSelection.ts";
import type { ChunkManager } from "../../services/chunkManager.ts";
import type { BytesPerRow } from "../../types/hex.types.ts";

interface HexViewerProps {
  chunkManager: ChunkManager | null;
  fileSize: number;
  bytesPerRow: BytesPerRow;
  onSelectOffset: (offset: number) => void;
}

export const HexViewer: React.FC<HexViewerProps> = React.memo(
  ({ chunkManager, fileSize, bytesPerRow, onSelectOffset }) => {
    const {
      selectedOffset,
      selectionRange,
      hoveredOffset,
      handleMouseDown,
      handleMouseEnter,
      handleMouseLeave,
    } = useHexSelection(onSelectOffset);

    // Render column headers (00 01 02 ... 0F)
    const headerIndices = useMemo(() => {
      const items: React.ReactNode[] = [];
      for (let i = 0; i < bytesPerRow; i++) {
        const addSeparator = i > 0 && i % 8 === 0;
        items.push(
          <React.Fragment key={i}>
            {addSeparator && <span className="w-2 inline-block" />}
            <span className="w-6 text-center text-neutral-500 font-mono text-[11px]">
              {i.toString(16).toUpperCase().padStart(2, "0")}
            </span>
          </React.Fragment>
        );
      }
      return items;
    }, [bytesPerRow]);

    return (
      <div className="flex-1 h-full flex flex-col bg-neutral-950 overflow-hidden select-none">
        {/* Fixed Column Header Bar */}
        <div className="h-8 border-b border-neutral-800 bg-neutral-900/60 flex items-center px-3 shrink-0">
          <div className="w-28 text-neutral-500 font-mono text-xs uppercase tracking-wider border-r border-neutral-800 pr-3 text-right">
            Offset
          </div>
          <div className="flex items-center gap-1.5 px-3 border-r border-neutral-800 shrink-0">
            {headerIndices}
          </div>
          <div className="px-3 text-neutral-500 font-mono text-xs uppercase tracking-wider">
            Decoded Text
          </div>
        </div>

        {/* Virtualized Grid Body */}
        <VirtualViewport fileSize={fileSize} bytesPerRow={bytesPerRow}>
          {({ renderedRowIndices }) => (
            <RowsContainer
              chunkManager={chunkManager}
              renderedRowIndices={renderedRowIndices}
              bytesPerRow={bytesPerRow}
              fileSize={fileSize}
              selectedOffset={selectedOffset}
              selectionRange={selectionRange}
              hoveredOffset={hoveredOffset}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </VirtualViewport>
      </div>
    );
  }
);

interface RowsContainerProps {
  chunkManager: ChunkManager | null;
  renderedRowIndices: number[];
  bytesPerRow: BytesPerRow;
  fileSize: number;
  selectedOffset: number | null;
  selectionRange: any;
  hoveredOffset: number | null;
  onMouseDown: (offset: number) => void;
  onMouseEnter: (offset: number) => void;
  onMouseLeave: () => void;
}

const RowsContainer: React.FC<RowsContainerProps> = React.memo(
  ({
    chunkManager,
    renderedRowIndices,
    bytesPerRow,
    fileSize,
    selectedOffset,
    selectionRange,
    hoveredOffset,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
  }) => {
    const { rowBytesMap } = useVisibleBytes({
      chunkManager,
      renderedRowIndices,
      bytesPerRow,
      fileSize,
    });

    return (
      <>
        {renderedRowIndices.map((rowIndex) => (
          <HexRow
            key={rowIndex}
            rowIndex={rowIndex}
            bytes={rowBytesMap.get(rowIndex) || null}
            bytesPerRow={bytesPerRow}
            selectedOffset={selectedOffset}
            selectionRange={selectionRange}
            hoveredOffset={hoveredOffset}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        ))}
      </>
    );
  }
);
