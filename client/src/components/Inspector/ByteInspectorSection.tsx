import React from "react";
import type { InspectedByte } from "../../types/hex.types.ts";
import { Binary } from "lucide-react";

interface ByteInspectorSectionProps {
  inspected: InspectedByte | null;
}

export const ByteInspectorSection: React.FC<ByteInspectorSectionProps> = ({
  inspected,
}) => {
  if (!inspected) {
    return (
      <div className="p-4 flex-1 flex flex-col items-center justify-center text-center text-neutral-600 text-xs">
        <Binary className="w-8 h-8 mb-2 opacity-40 text-neutral-500" />
        <p>Click any byte in the viewer to inspect integer and character encodings.</p>
      </div>
    );
  }

  const renderValue = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) {
      return <span className="text-neutral-600 italic">N/A</span>;
    }
    return <span className="text-neutral-200 font-mono select-text">{val}</span>;
  };

  return (
    <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-mono">
      {/* Selected byte indicator */}
      <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded px-3 py-2">
        <span className="text-neutral-400 font-sans">Selected Offset:</span>
        <span className="text-yellow-400 font-bold">
          0x{inspected.offset.toString(16).toUpperCase().padStart(8, "0")} (
          {inspected.offset.toLocaleString()})
        </span>
      </div>

      {/* Little-Endian Interpretation */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-md p-3">
        <h3 className="font-sans font-semibold text-neutral-300 text-xs mb-2.5 pb-1 border-b border-neutral-800 flex items-center justify-between">
          <span>Byte Inspector (Little-endian)</span>
          <span className="text-[10px] text-blue-400 font-normal">LE</span>
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-400">8-bit Integer:</span>
            {renderValue(inspected.uint8)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">16-bit Integer:</span>
            {renderValue(inspected.littleEndian.uint16)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">32-bit Integer:</span>
            {renderValue(inspected.littleEndian.uint32)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">64-bit Integer:</span>
            {renderValue(inspected.littleEndian.uint64)}
          </div>
          <div className="flex justify-between pt-1 border-t border-neutral-800/50">
            <span className="text-neutral-400">UTF-8 Character:</span>
            <span className="text-blue-400 font-bold">{inspected.ascii}</span>
          </div>
        </div>
      </div>

      {/* Big-Endian Interpretation */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-md p-3">
        <h3 className="font-sans font-semibold text-neutral-300 text-xs mb-2.5 pb-1 border-b border-neutral-800 flex items-center justify-between">
          <span>Byte Inspector (Big-endian)</span>
          <span className="text-[10px] text-purple-400 font-normal">BE</span>
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-400">8-bit Integer:</span>
            {renderValue(inspected.uint8)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">16-bit Integer:</span>
            {renderValue(inspected.bigEndian.uint16)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">32-bit Integer:</span>
            {renderValue(inspected.bigEndian.uint32)}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">64-bit Integer:</span>
            {renderValue(inspected.bigEndian.uint64)}
          </div>
          <div className="flex justify-between pt-1 border-t border-neutral-800/50">
            <span className="text-neutral-400">UTF-8 Character:</span>
            <span className="text-purple-400 font-bold">{inspected.ascii}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
