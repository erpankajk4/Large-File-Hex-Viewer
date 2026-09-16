import React from "react";
import { OffsetGutter } from "./OffsetGutter.tsx";
import { HexPane } from "./HexPane.tsx";
import { AsciiPane } from "./AsciiPane.tsx";
import type { BytesPerRow, SelectionRange } from "../../types/hex.types.ts";

interface HexRowProps {
  rowIndex: number;
  bytes: Uint8Array | null;
  bytesPerRow: BytesPerRow;
  selectedOffset: number | null;
  selectionRange: SelectionRange | null;
  hoveredOffset: number | null;
  onMouseDown: (offset: number) => void;
  onMouseEnter: (offset: number) => void;
  onMouseLeave: () => void;
}

export const HexRow: React.FC<HexRowProps> = React.memo(
  ({
    rowIndex,
    bytes,
    bytesPerRow,
    selectedOffset,
    selectionRange,
    hoveredOffset,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
  }) => {
    const rowOffset = rowIndex * bytesPerRow;

    return (
      <div className="h-6 flex items-center hover:bg-neutral-900/50 px-3 transition-colors border-b border-neutral-900/40">
        <OffsetGutter offset={rowOffset} />
        <HexPane
          rowOffset={rowOffset}
          bytes={bytes}
          bytesPerRow={bytesPerRow}
          selectedOffset={selectedOffset}
          selectionRange={selectionRange}
          hoveredOffset={hoveredOffset}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
        <AsciiPane
          rowOffset={rowOffset}
          bytes={bytes}
          bytesPerRow={bytesPerRow}
          selectedOffset={selectedOffset}
          selectionRange={selectionRange}
          hoveredOffset={hoveredOffset}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </div>
    );
  }
);
