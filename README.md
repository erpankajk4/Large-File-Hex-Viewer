# Large-File Hex Viewer

A high-performance, web-based hexadecimal forensic viewer engineered to inspect raw binary dumps of arbitrary file sizes (from small 10 KB headers up to 10+ GB disk images) with sub-millisecond interaction times, a flat DOM element count, and bounded memory consumption (< 25 MB RAM).

Inspired by forensic tools like [hexed.it](https://hexed.it), designed for examining damaged databases, unknown firmware blobs, and large memory captures.

---

## Key Technical Highlights

- **Instant Opening of Arbitrary File Sizes**: Opening a 10 GB file is as fast and consumes as little memory as opening a 10 KB file.
- **Zero Full-File Server Buffering**: The backend uses Node's native `fs.createReadStream({ start, end })` to stream raw byte slices directly from the filesystem using OS-level seeking (`pread`).
- **Bounded In-Memory LRU Cache**: The frontend manages an aligned 64 KB chunk manager with a bounded 128-chunk LRU cache (~8.19 MB RAM ceiling), ensuring flat memory usage during long analysis sessions.
- **Flat DOM Virtual Windowing**: Regardless of file size, the DOM only renders ~35–40 visible rows at any given time.
- **Overcomes Browser CSS Height Constraints**: Employs normalized ratio mapping to bypass the browser's 16.7M–33.5M pixel ceiling, enabling seamless navigation across 671+ million rows.
- **64-bit Integer Precision**: Uses `BigInt` with `DataView.prototype.getBigUint64` to prevent IEEE-754 precision loss when inspecting large integer offsets and timestamps.

> For in-depth technical analysis, windowing math, caching rationale, and failure mode analysis, see [DESIGN_NOTES.md](DESIGN_NOTES.md).

---

## Project Structure

```
Large-File-Hex-Viewer/
├── data/                       # Local directory storing target binary files (regular files only)
├── scripts/
│   └── generate-test-files.js  # Instant sparse-file generator (10 KB to 10 GB)
├── server/                     # Express 5 / Node backend (pure ES Modules)
│   ├── src/
│   │   ├── config/             # Environment and CORS configuration
│   │   ├── middlewares/        # Validation, error handling, not-found handlers
│   │   ├── modules/files/      # File listing, metadata, and byte-range streaming
│   │   ├── routes/             # API routing
│   │   └── shared/             # Shared AppError and response helpers
│   ├── test-server.js          # Backend endpoint validation tests
│   └── index.js                # Server entrypoint
├── client/                     # React 19 + TypeScript + Vite 6 + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── HexViewer/      # VirtualViewport, OffsetGutter, HexPane, AsciiPane, HexRow
│   │   │   ├── Inspector/      # SettingsSection, FileInfoSection, ByteInspectorSection
│   │   │   └── Layout/         # Header, FileSelector, StatusBar
│   │   ├── hooks/              # useVirtualScroll (ratio-based windowing)
│   │   ├── services/           # ChunkManager (LRU cache, coalescing) & byteParser
│   │   └── types/              # Hex and API TypeScript definitions
│   ├── test-chunk-manager.js   # Unit tests for chunking and LRU cache
│   ├── test-virtual-scroll.js  # Unit tests for virtual scroll math
│   └── test-byte-parser.js     # Unit tests for Little/Big Endian integer parsing
├── DESIGN_NOTES.md             # In-depth architectural notes & failure modes
└── README.md                   # Setup and usage documentation
```

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/) (v1.0+) installed. No additional system dependencies are required.

---

### 1. Generate Test Files (10 KB to 10 GB)

Run the built-in sparse file generator to populate `./data/` with test binaries:

```bash
# Using Node:
node scripts/generate-test-files.js

# Or using Bun:
bun run generate:data
```

*Note: The generator uses filesystem sparse allocation (`fs.ftruncateSync`), meaning the 10 GB file is generated in under 50 milliseconds without consuming 10 GB of physical disk space.*

---

### 2. Start the Backend Server

```bash
cd server
npm install   # or bun install
npm run dev   # or bun dev / node index.js
```

The backend server starts on `http://localhost:5000`.

---

### 3. Start the Frontend Application

```bash
cd client
npm install   # or bun install
npm run dev   # or bun dev
```

Open `http://localhost:5173` in your browser.

---

## Automated Test Suites

The repository includes standalone validation suites covering the core requirements:

```bash
# 1. Validate Backend Endpoints (Byte-range streaming, 4 GB offset seeking, security traversal)
cd server
node test-server.js           # or bun test-server.js

# 2. Validate ChunkManager (64 KB alignment, in-flight request coalescing, bounded LRU eviction)
cd client
node test-chunk-manager.js    # or bun test-chunk-manager.js

# 3. Validate Virtual Scroll Math (6,000,000 px clamped spacer, 671M row normalized mapping)
cd client
node test-virtual-scroll.js   # or bun test-virtual-scroll.js

# 4. Validate Byte Inspector (Little-Endian & Big-Endian DataView math, 64-bit BigInt safety)
cd client
node test-byte-parser.js      # or bun test-byte-parser.js
```

All test suites run directly from the command line with zero external test runner dependencies.

---

## User Interface & Features

1. **Offset Gutter**: Displays 10-digit uppercase hexadecimal offsets (e.g. `0000000000`, `0000000130`), supporting multi-gigabyte offsets well past 32-bit limits.
2. **Hex Pane**:
   - Monospace 2-digit uppercase hex values separated by spaces.
   - Distinct visual spacing separator every 8 bytes for rapid visual alignment.
   - Synchronized hover and click-drag range selection.
3. **ASCII Pane**:
   - Printable ASCII (`0x20` to `0x7E`) and non-printable control characters rendered as dots (`.`).
   - Line-for-line synchronized with the hex column. Hovering or dragging in ASCII selects the corresponding bytes in Hex and vice versa.
4. **Inspector Panel**:
   - **Settings**: Dynamic column widths supporting **8, 16, and 32 bytes per row**.
   - **File Information**: Active file name, total size formatted in KB/MB/GB, and exact byte count.
   - **Jump to Offset**: Immediate $O(1)$ navigation via Hex (`0x130`, `0x40000000`) or Decimal (`304`, `1073741824`).
   - **Byte Inspector**:
     - 8-bit unsigned integer (`uint8`)
     - 16-bit integer (`uint16`) in Little-Endian and Big-Endian
     - 32-bit integer (`uint32`) in Little-Endian and Big-Endian
     - 64-bit integer (`uint64`) in Little-Endian and Big-Endian (using `BigInt` to guarantee precision)
     - Character representation
5. **Diagnostics & Telemetry Bar**: Real-time cursor coordinates (Hex and Decimal), live cached chunk count, approximate memory consumption, and cache hit/miss ratio counters.

---

## Technical Documentation

For the complete technical breakdown, see **[DESIGN_NOTES.md](DESIGN_NOTES.md)**:
- Server vs. Browser responsibility split and binary streaming rationale.
- Mathematical proof and implementation of the normalized ratio virtual scroll.
- 64 KB chunk size selection, LRU cache memory bounds, and request deduplication.
- Edge cases handled (EOF boundary safety, directory traversal guards, empty files).
- Proposed future extensions (streaming forensic search, sparse patching, Shannon entropy mapping).
