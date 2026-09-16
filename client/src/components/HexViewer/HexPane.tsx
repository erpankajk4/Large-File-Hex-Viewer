import React from "react";
import type { BytesPerRow, SelectionRange } from "../../types/hex.types.ts";

interface HexPaneProps {
  rowOffset: number;
  bytes: Uint8Array | null;
  bytesPerRow: BytesPerRow;
  selectedOffset: number | null;
  selectionRange: SelectionRange | null;
  hoveredOffset: number | null;
  onMouseDown: (offset: number) => void;
  onMouseEnter: (offset: number) => void;
  onMouseLeave: () => void;
}

export const HexPane: React.FC<HexPaneProps> = React.memo(
  ({
    rowOffset,
    bytes,
    bytesPerRow,
    selectedOffset,
    selectionRange,
    hoveredOffset,
    onMouseDown,
    onMouseEnter,
    onMouseLeave,
  }) => {
    const byteCount = bytes ? bytes.length : 0;
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < bytesPerRow; i++) {
      const currentOffset = rowOffset + i;
      const hasByte = i < byteCount;
      const byteVal = hasByte && bytes ? bytes[i] : null;

      // Selection calculations
      const isSelected = selectedOffset === currentOffset;
      const isInRange =
        selectionRange !== null &&
        currentOffset >= selectionRange.start &&
        currentOffset <= selectionRange.end;
      const isHovered = hoveredOffset === currentOffset;

      // Group separator after every 8 bytes for forensic visual rhythm
      const addSeparator = i > 0 && i % 8 === 0;

      if (!hasByte) {
        cells.push(
          <React.Fragment key={i}>
            {addSeparator && <span className="w-2 inline-block" />}
            <span className="w-6 text-center text-neutral-800 select-none">
              ··
            </span>
          </React.Fragment>
        );
        continue;
      }

      const hexText = byteVal!.toString(16).toUpperCase().padStart(2, "0");

      let cellStyle = "text-neutral-300 hover:bg-neutral-800";
      if (isSelected) {
        cellStyle =
          "ring-2 ring-yellow-400 bg-yellow-500/30 text-yellow-200 font-bold z-10 rounded-sm";
      } else if (isInRange) {
        cellStyle = "bg-blue-600/40 text-blue-100 rounded-sm";
      } else if (isHovered) {
        cellStyle = "bg-neutral-800 text-yellow-300 ring-1 ring-neutral-600 rounded-sm";
      }

      cells.push(
        <React.Fragment key={i}>
          {addSeparator && <span className="w-2 inline-block select-none" />}
          <span
            onMouseDown={(e) => {
              e.preventDefault();
              onMouseDown(currentOffset);
            }}
            onMouseEnter={() => onMouseEnter(currentOffset)}
            onMouseLeave={onMouseLeave}
            className={`w-6 h-5 inline-flex items-center justify-center font-mono text-[13px] tracking-tight cursor-pointer transition-colors duration-75 ${cellStyle}`}
          >
            {hexText}
          </span>
        </React.Fragment>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-3 border-r border-neutral-800 select-none shrink-0">
        {cells}
      </div>
    );
  }
);
