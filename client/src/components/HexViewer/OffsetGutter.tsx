import React from "react";

interface OffsetGutterProps {
  offset: number;
}

/**
 * Renders the zero-padded hexadecimal byte offset of the row's first byte.
 * e.g. 0000000000, 0000000010, 0000000130.
 * Uses 10 hex digits to comfortably display offsets exceeding 4 GB.
 */
export const OffsetGutter: React.FC<OffsetGutterProps> = React.memo(({ offset }) => {
  const hexStr = offset.toString(16).toUpperCase().padStart(10, "0");

  return (
    <div className="w-28 text-neutral-500 font-mono text-[13px] tracking-wider select-none shrink-0 border-r border-neutral-800 pr-3 text-right">
      {hexStr}
    </div>
  );
});
