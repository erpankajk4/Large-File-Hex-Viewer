import React from "react";
import type { BytesPerRow } from "../../types/hex.types.ts";
import { Sliders } from "lucide-react";

interface SettingsSectionProps {
  bytesPerRow: BytesPerRow;
  onChangeBytesPerRow: (val: BytesPerRow) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  bytesPerRow,
  onChangeBytesPerRow,
}) => {
  const options: BytesPerRow[] = [8, 16, 32];

  return (
    <div className="p-4 border-b border-neutral-800">
      <div className="flex items-center gap-2 mb-3">
        <Sliders className="w-4 h-4 text-blue-400" />
        <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
          Settings
        </h2>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-400">Bytes Per Row:</span>
        <div className="flex bg-neutral-900 border border-neutral-800 rounded p-0.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChangeBytesPerRow(opt)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                bytesPerRow === opt
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
