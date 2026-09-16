import { useState, useEffect, useMemo, useCallback } from "react";
import { ApiService } from "./services/api.service.ts";
import { ChunkManager } from "./services/chunkManager.ts";
import { parseByteInspector } from "./services/byteParser.ts";
import { HexViewer } from "./components/HexViewer/HexViewer.tsx";
import { InspectorPanel } from "./components/Inspector/InspectorPanel.tsx";
import type { FileItem, FileMetadata } from "./types/api.types.ts";
import type { BytesPerRow, InspectedByte, CacheStats } from "./types/hex.types.ts";
import { Database, Activity, RefreshCw } from "lucide-react";

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  // Hex settings & selection
  const [bytesPerRow, setBytesPerRow] = useState<BytesPerRow>(16);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);
  const [inspectedValues, setInspectedValues] = useState<InspectedByte | null>(null);

  // Telemetry stats
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // Create persistent ChunkManager instance per selected file
  const chunkManager = useMemo(() => {
    if (!selectedFile) return null;
    return new ChunkManager(selectedFile.id, selectedFile.size);
  }, [selectedFile]);

  // Load available files from ./data
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const list = await ApiService.listFiles();
      setFiles(list);
      if (list.length > 0 && !selectedFile) {
        setSelectedFile(list[0]);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // When selected file changes, fetch its metadata and reset selection
  useEffect(() => {
    if (!selectedFile) return;

    ApiService.getFileMetadata(selectedFile.id)
      .then((meta) => {
        setMetadata(meta);
        // Default select first byte (or sample offset 0x130 if file is big enough)
        const defaultOffset = meta.size > 0x130 ? 0x130 : 0;
        setSelectedOffset(defaultOffset);
      })
      .catch((err) => console.error("Failed to fetch metadata:", err));
  }, [selectedFile]);

  // Update Byte Inspector whenever selectedOffset changes
  useEffect(() => {
    if (!chunkManager || !selectedFile || selectedOffset === null) {
      setInspectedValues(null);
      return;
    }

    // Read 8 consecutive bytes starting from selectedOffset for uint8/16/32/64 inspection
    chunkManager
      .getBytes(selectedOffset, 8)
      .then((bytes) => {
        const parsed = parseByteInspector(bytes, selectedOffset, selectedFile.size);
        setInspectedValues(parsed);
        setCacheStats(chunkManager.getStats());
      })
      .catch((err) => console.error("Failed to inspect byte:", err));
  }, [chunkManager, selectedFile, selectedOffset]);

  // Periodic telemetry update for cache stats
  useEffect(() => {
    if (!chunkManager) return;
    const interval = setInterval(() => {
      setCacheStats(chunkManager.getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [chunkManager]);

  const handleJumpToOffset = (offset: number) => {
    setSelectedOffset(offset);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-xs tracking-wider uppercase font-mono">
              Large-File Hex Viewer
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
            64-Bit Virtualized Engine
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-neutral-400 font-medium">Active File:</label>
          <select
            className="bg-neutral-800 border border-neutral-700 text-xs rounded px-3 py-1 text-neutral-200 font-mono outline-none focus:border-blue-500 cursor-pointer"
            value={selectedFile?.id || ""}
            onChange={(e) => {
              const file = files.find((f) => f.id === e.target.value);
              if (file) {
                setSelectedFile(file);
              }
            }}
          >
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </option>
            ))}
          </select>

          <button
            onClick={loadFiles}
            title="Refresh file list"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Forensic Viewport & Inspector Layout */}
      <div className="flex-1 flex overflow-hidden">
        {loading && !selectedFile ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-neutral-400 text-xs">
            <Activity className="w-4 h-4 animate-spin text-blue-400" />
            Scanning ./data directory...
          </div>
        ) : selectedFile ? (
          <>
            {/* Hex Grid Viewport (Offset Gutter, Hex Pane, ASCII Pane) */}
            <HexViewer
              chunkManager={chunkManager}
              fileSize={selectedFile.size}
              bytesPerRow={bytesPerRow}
              onSelectOffset={setSelectedOffset}
            />

            {/* Right-hand Inspector Panel */}
            <InspectorPanel
              bytesPerRow={bytesPerRow}
              onChangeBytesPerRow={setBytesPerRow}
              metadata={metadata}
              inspected={inspectedValues}
              onJumpToOffset={handleJumpToOffset}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
            No files available in ./data. Run "bun generate:data" to create test files.
          </div>
        )}
      </div>

      {/* Bottom Forensic Telemetry Status Bar */}
      <footer className="h-7 border-t border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            Offset:{" "}
            <span className="text-yellow-400 font-semibold">
              0x{selectedOffset !== null ? selectedOffset.toString(16).toUpperCase().padStart(8, "0") : "00000000"}
            </span>{" "}
            <span className="text-neutral-500">
              ({selectedOffset !== null ? selectedOffset.toLocaleString() : 0} bytes)
            </span>
          </div>
          <div className="text-neutral-600">|</div>
          <div>
            Total Rows:{" "}
            <span className="text-neutral-300">
              {selectedFile ? Math.ceil(selectedFile.size / bytesPerRow).toLocaleString() : 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            RAM Cache:{" "}
            <span className="text-blue-400 font-semibold">
              {cacheStats ? `${cacheStats.cachedChunks} / ${cacheStats.maxChunks} chunks` : "0 / 128"}
            </span>{" "}
            <span className="text-neutral-500">
              ({cacheStats ? (cacheStats.memoryBytes / (1024 * 1024)).toFixed(2) : "0.00"} MB)
            </span>
          </div>
          <div className="text-neutral-600">|</div>
          <div>
            Hits:{" "}
            <span className="text-green-400 font-semibold">{cacheStats?.hits || 0}</span> / Misses:{" "}
            <span className="text-neutral-400">{cacheStats?.misses || 0}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
