# Design Notes: Large-File Hex Viewer

This document details the architectural decisions, constraints, performance trade-offs, and failure modes considered during the engineering of this large-file hexadecimal viewer.

---

## 1. System Architecture: Server vs. Browser Responsibility Split

The system is designed around a single guiding invariant: **Opening a 10 GB file must be as fast and consume as little memory as opening a 10 KB file.**

To fulfill this guarantee, responsibilities are strictly partitioned between the backend service and the client application:

```
[ Local Disk: ./data ]
        │
        │ fs.createReadStream({ start, end })  <-- Low-level OS pread seek (Zero Buffering)
        ▼
[ Node/Bun Express Backend ]
        │
        │ HTTP 200 (application/octet-stream, Content-Range)
        ▼
[ Browser Network Layer ]
        │
        ▼
[ Client: ChunkManager ]  <-- 64 KB chunks, 128-entry bounded LRU cache (~8.19 MB)
        │
        ├──> [ VirtualViewport ]    <-- Virtual windowing (~35-40 DOM rows)
        ├──> [ Hex & ASCII Panes ]  <-- Synchronized hover, selection & rendering
        └──> [ Byte Inspector ]     <-- Client-side DataView (LE / BE uint8..uint64)
```

### Server Responsibility: Byte-Range Streaming Provider
- **Zero Full-File Buffering**: The server never reads an entire file into RAM or creates full buffers. It uses Node's native `fs.createReadStream(filePath, { start, end })`, which instructs the OS kernel to perform direct block seeks (`pread`).
- **Binary Streaming (`application/octet-stream`)**: The server streams raw binary octets directly to the HTTP socket rather than Base64-encoding or wrapping byte arrays in JSON.
  - *Eliminates JSON serialization overhead on the server.*
  - *Saves 33% network bandwidth compared to Base64.*
  - *Enables direct zero-copy instantiation of `ArrayBuffer` and `Uint8Array` in the browser.*
- **Security Invariants**:
  - The server explicitly restricts access to regular files residing directly inside the `./data` directory.
  - Subdirectories are ignored.
  - All file IDs are sanitized with `path.basename()` and verified using `path.resolve()` prefix checks to prevent directory traversal attempts (`../../`).

### Browser Responsibility: Viewport Windowing & Forensic Analysis
- The browser handles DOM virtualization, user interaction (scrolling, clicking, drag-selection), local caching, and byte interpretation (integers, endianness, ASCII rendering).
- Performing byte decoding client-side via native `DataView` ensures that byte inspection and endianness toggling respond in sub-millisecond time without requiring network round-trips.

---

## 2. Windowing: The Browser Max Element Height Solution

### The Constraint
Modern browser rendering engines (Chromium/Blink, Firefox/Gecko, Safari/WebKit) enforce an internal ceiling on CSS element dimensions, generally between **16.7 Million and 33.5 Million pixels** ($2^{24}$ to $2^{25}$ px).

For a 10 GB file ($10,737,418,240$ bytes) configured at 16 bytes per row:
- Total rows: $\lceil 10,737,418,240 / 16 \rceil = \mathbf{671,088,640\text{ rows}}$.
- At 24 pixels per row, naive scroll height calculation yields:
  $$671,088,640 \times 24\text{ px} \approx \mathbf{16,106,127,360\text{ pixels (16.1 Billion px)}}$$

Setting an element's height to 16.1 billion pixels causes browser engines to clip the height, refuse to scroll past ~16M pixels, or exhaust graphics memory and crash.

### The Solution: Normalized Virtual Scroll Ratio Mapping
We resolve this limitation using a two-tier virtual windowing strategy:

1. **Clamped Virtual Spacer**:
   - For small and medium files where `totalRows * rowHeight <= 6,000,000 px`, standard 1:1 pixel mapping is preserved.
   - For large files exceeding this threshold, the virtual spacer height is clamped to:
     $$\text{MAX\_VIRTUAL\_HEIGHT} = 6,000,000\text{ px}$$
     This is well within safe browser limits while providing ample physical scroll distance for smooth scrollbar dragging.

2. **Ratio-Based Row Computation**:
   When the user drags the native scrollbar thumb, the visible start row is calculated in $O(1)$ time using the normalized scroll ratio $P \in [0, 1]$:
   $$P = \frac{\text{scrollTop}}{\text{MAX\_VIRTUAL\_HEIGHT} - \text{viewportHeight}}$$
   $$\text{startRowIndex} = \lfloor P \times (\text{totalRows} - \text{visibleRowCount}) \rfloor$$

3. **High-Precision Wheel & Keyboard Navigation**:
   To prevent ratio-scaling quantization when scrolling with the mouse wheel or arrow keys, wheel events intercept `e.deltaY` and advance `startRowIndex` directly by integer row deltas ($\pm 3$ rows, or $\pm 10$ with Shift), synchronizing `scrollTop` back to the scrollbar thumb.

4. **Flat DOM Footprint**:
   Regardless of whether the file is 10 KB or 10 GB, the DOM contains only $\sim 35\text{ to }40$ row elements (visible rows + 4 overscan buffer rows).

---

## 3. Caching: Chunk Size, LRU Eviction & Request Coalescing

| Component | Specification | Technical Justification |
| :--- | :--- | :--- |
| **Chunk Size** | **64 KB** ($65,536$ bytes) | - At 16 bytes/row, 64 KB encompasses **4,096 rows** (~100 viewports on a 1080p screen).<br>- 64 KB transfers over HTTP in $< 2$ ms.<br>- If substantially smaller (e.g. 4 KB), rapid scrolling generates excessive HTTP requests.<br>- If substantially larger (e.g. 1 MB), random offset jumps suffer download latency, and memory fills up too quickly. |
| **Cache Capacity** | **128 Chunks** | $128 \times 64\text{ KB} = \mathbf{8.19\text{ MB}}$ maximum in-memory cache footprint. Ensures client memory stays flat indefinitely even during extended analysis sessions. |
| **Eviction Policy** | **LRU (Least Recently Used)** | Implemented using JavaScript's native `Map`, which preserves key insertion order. Cache hits are promoted to Most Recently Used ($O(1)$ re-insertion). When capacity reaches 128, the oldest entry (`cache.keys().next().value`) is evicted in $O(1)$ time. |
| **Request Coalescing** | `inFlightRequests` Map | Prevents redundant network round-trips. If multiple rows or components request the same 64 KB chunk simultaneously while a fetch is pending, they attach to the single existing Promise. |
| **Cross-Boundary Slicing** | `getBytes(offset, length)` | Arbitrary byte queries spanning chunk boundaries (e.g., inspecting an 8-byte integer at offset 65,532) transparently load both adjacent chunks and concatenate the exact slice. |
| **Prefetching** | Opportunistic +1 Chunk | When scrolling sequentially, `ChunkManager` initiates a non-blocking background fetch for the next adjacent chunk. |

---

## 4. Forensic Endianness & 64-bit Integer Precision

Standard JavaScript `Number` represents values as IEEE-754 double-precision floating-point numbers. These lose precision for integers exceeding $2^{53} - 1$ ($9,007,199,254,740,991$).

Forensic binaries, timestamps, and memory dumps frequently contain 64-bit unsigned integers exceeding this limit (up to $18,446,744,073,709,551,615$).

- **BigInt Safeguard**: The inspector decodes 64-bit integers using `DataView.prototype.getBigUint64(0, isLittleEndian)` and serializes directly to strings.
- **Verification Vector**:
  At offset `0x0130`, the byte sequence `52 00 47 00 42 58 59 5A` yields:
  - **Little-Endian uint64**: `6510331776836501586`
  - **Big-Endian uint64**: `5908800777548749146`
  Using standard `Number` would round these values, causing subtle forensic errors. `BigInt` guarantees single-digit accuracy.

---

## 5. Failure Modes & Edge Cases Handled

1. **Rapid Fling Scrolling on Slow Connections**:
   - *Risk*: Rapidly dragging the scrollbar thumb across gigabytes on a high-latency connection can trigger multiple cache misses before prior responses resolve.
   - *Handling*: In-flight request coalescing ensures only unique chunk offsets are fetched. The viewer renders graceful loading placeholders until bytes arrive, without freezing the main thread.
2. **End-of-File (EOF) Multi-Byte Inspection**:
   - *Risk*: Selecting a byte near the end of a file (e.g. 2 bytes before EOF) and attempting to parse a 32-bit or 64-bit integer would trigger an out-of-bounds `RangeError` in `DataView`.
   - *Handling*: `byteParser` checks `remaining = fileSize - offset`. If insufficient bytes remain, it returns `null` for multi-byte fields, rendering `N/A` cleanly in the inspector.
3. **Empty (0-byte) Files**:
   - *Handling*: Backend detects `fileSize === 0` and immediately returns an empty stream with `isEof: true`. Frontend virtual viewport clamps row counts to 0 and displays an informative empty state.
4. **Path Traversal Attacks**:
   - *Handling*: Requests attempting `GET /api/files/..%2F..%2Fetc%2Fpasswd/meta` are stripped to the basename and checked against the normalized `./data` path, rejecting invalid requests with HTTP 403.

---

## 6. Future Extensions (With Another Week)

1. **Server-Side Forensic Pattern & Hex Search**:
   - Implement a streaming Boyer-Moore-Horspool search algorithm on the backend that scans raw byte streams chunk-by-chunk, finding byte sequences (e.g., file magic headers `\x89PNG`, `\x50\x4B\x03\x04`) across 10 GB in seconds without loading the file into memory.
2. **Client-Side Sparse Editing & Patch Export**:
   - Maintain a sparse in-memory modification map (`Map<number, number>`) tracking edited bytes.
   - Render modified bytes with distinct visual badges.
   - Allow exporting IPS/UPS patch files or modified binaries.
3. **Entropy & Structure Heatmap (Shannon Entropy)**:
   - Calculate Shannon entropy for each 64 KB block ($H = -\sum p_i \log_2 p_i$) and render an interactive minimap alongside the scrollbar.
   - Allows investigators to visually identify compressed, encrypted, or zero-padded regions instantly.
4. **Structure Dissectors / Template Parsing**:
   - Integrate binary template definitions (similar to 010 Editor or Kaitai Struct) to automatically annotate PE, ELF, ZIP, and SQLite file headers directly inside the hex pane.
