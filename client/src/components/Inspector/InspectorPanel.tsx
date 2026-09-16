import React from "react";
import { SettingsSection } from "./SettingsSection.tsx";
import { FileInfoSection } from "./FileInfoSection.tsx";
import { ByteInspectorSection } from "./ByteInspectorSection.tsx";
import type { BytesPerRow, InspectedByte } from "../../types/hex.types.ts";
import type { FileMetadata } from "../../types/api.types.ts";

interface InspectorPanelProps {
  bytesPerRow: BytesPerRow;
  onChangeBytesPerRow: (val: BytesPerRow) => void;
  metadata: FileMetadata | null;
  inspected: InspectedByte | null;
  onJumpToOffset: (offset: number) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = React.memo(
  ({
    bytesPerRow,
    onChangeBytesPerRow,
    metadata,
    inspected,
    onJumpToOffset,
  }) => {
    return (
      <aside className="w-80 h-full border-l border-neutral-800 bg-neutral-900/40 flex flex-col shrink-0 select-none overflow-hidden">
        <SettingsSection
          bytesPerRow={bytesPerRow}
          onChangeBytesPerRow={onChangeBytesPerRow}
        />
        <FileInfoSection
          metadata={metadata}
          onJumpToOffset={onJumpToOffset}
        />
        <ByteInspectorSection inspected={inspected} />
      </aside>
    );
  }
);
