import React, { useState } from "react";
import type { FileMetadata } from "../../types/api.types.ts";
import { FileText, ArrowRight } from "lucide-react";

interface FileInfoSectionProps {
  metadata: FileMetadata | null;
  onJumpToOffset: (offset: number) => void;
}

export const FileInfoSection: React.FC<FileInfoSectionProps> = ({
  metadata,
  onJumpToOffset,
}) => {
  const [jumpInput, setJumpInput] = useState("");

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpInput.trim()) return;

    let targetOffset: number;
    const cleanStr = jumpInput.trim();

    if (cleanStr.startsWith("0x") || cleanStr.startsWith("0X")) {
      targetOffset = parseInt(cleanStr, 16);
    } else {
      targetOffset = parseInt(cleanStr, 10);
    }

    if (!isNaN(targetOffset) && targetOffset >= 0) {
      onJumpToOffset(targetOffset);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="p-4 border-b border-neutral-800 text-xs">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-blue-400" />
        <h2 className="font-semibold text-neutral-300 uppercase tracking-wider">
          File Information
        </h2>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <span className="text-neutral-400">File Name:</span>
          <span
            className="text-neutral-200 font-mono font-medium max-w-[180px] truncate text-right"
            title={metadata?.name}
          >
            {metadata?.name || "None"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-neutral-400">File Size:</span>
          <span className="text-neutral-200 font-mono font-medium">
            {metadata ? formatSize(metadata.size) : "0 KB"}
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-neutral-500">Total Bytes:</span>
          <span className="text-neutral-400 font-mono">
            {metadata?.size.toLocaleString() || 0}
          </span>
        </div>
      </div>

      {/* Jump to Offset Box */}
      <form onSubmit={handleJump} className="mt-4 pt-3 border-t border-neutral-800/80">
        <label className="block text-neutral-400 mb-1.5 font-medium">
          Jump to Offset (Hex or Decimal):
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. 0x130 or 304"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-neutral-200 font-mono text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2.5 py-1 rounded flex items-center justify-center transition-colors"
            title="Go to offset"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
