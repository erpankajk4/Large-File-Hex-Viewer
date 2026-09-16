import React from "react";
import type { BytesPerRow, SelectionRange } from "../../types/hex.types.ts";

interface AsciiPaneProps {
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

export const AsciiPane: React.FC<AsciiPaneProps> = React.memo(
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
    const chars: React.ReactNode[] = [];

    for (let i = 0; i < bytesPerRow; i++) {
      const currentOffset = rowOffset + i;
      const hasByte = i < byteCount;
      const byteVal = hasByte && bytes ? bytes[i] : null;

      const isSelected = selectedOffset === currentOffset;
      const isInRange =
        selectionRange !== null &&
        currentOffset >= selectionRange.start &&
        currentOffset <= selectionRange.end;
      const isHovered = hoveredOffset === currentOffset;

      if (!hasByte) {
        chars.push(
          <span key={i} className="w-3 text-center text-neutral-800 select-none">
            ·
          </span>
        );
        continue;
      }

      // Printable ASCII is between 0x20 (space) and 0x7E (tilde ~). Otherwise show dot '.'
      const isPrintable = byteVal! >= 0x20 && byteVal! <= 0x7e;
      const charDisplay = isPrintable ? String.fromCharCode(byteVal!) : ".";

      let charStyle = isPrintable ? "text-neutral-200" : "text-neutral-600";
      if (isSelected) {
        charStyle =
          "ring-2 ring-yellow-400 bg-yellow-500/30 text-yellow-200 font-bold z-10 rounded-sm";
      } else if (isInRange) {
        charStyle = "bg-blue-600/40 text-blue-100 rounded-sm";
      } else if (isHovered) {
        charStyle = "bg-neutral-800 text-yellow-300 ring-1 ring-neutral-600 rounded-sm";
      }

      chars.push(
        <span
          key={i}
          onMouseDown={(e) => {
            e.preventDefault();
            onMouseDown(currentOffset);
          }}
          onMouseEnter={() => onMouseEnter(currentOffset)}
          onMouseLeave={onMouseLeave}
          className={`w-3.5 h-5 inline-flex items-center justify-center font-mono text-[13px] cursor-pointer transition-colors duration-75 ${charStyle}`}
        >
          {charDisplay}
        </span>
      );
    }

    return (
      <div className="flex items-center px-3 tracking-tighter select-none shrink-0">
        {chars}
      </div>
    );
  }
);
