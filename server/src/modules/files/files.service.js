import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.config.js";
import { AppError } from "../../shared/errors/AppError.js";

/**
 * Service handling disk access and streaming range queries.
 *
 * Design considerations:
 * 1. Zero Buffering: Uses `fs.createReadStream` with `{ start, end }` options.
 *    The operating system kernel directly seeks to `offset` and reads only the requested slice.
 * 2. Directory Traversal Guard: Uses `path.basename` to prevent malicious paths like `../../etc/passwd`.
 * 3. Scope: Only regular files directly in ./data are accessible.
 */
export class FilesService {
  /**
   * Resolves a file ID safely within the hardcoded DATA_DIR.
   */
  static resolveSafeFilePath(fileId) {
    if (!fileId || typeof fileId !== "string") {
      throw new AppError("Invalid file identifier", 400);
    }

    // Strip directory traversal attempts
    const safeName = path.basename(fileId);
    const fullPath = path.join(env.dataDir, safeName);

    // Verify the resolved path is strictly within dataDir
    const normalizedDataDir = path.resolve(env.dataDir);
    const normalizedFullPath = path.resolve(fullPath);

    if (!normalizedFullPath.startsWith(normalizedDataDir)) {
      throw new AppError("Access denied: path traversal detected", 403);
    }

    return { safeName, fullPath };
  }

  /**
   * Lists all regular files directly inside DATA_DIR (ignores subdirectories).
   */
  static async listFiles() {
    await fsp.mkdir(env.dataDir, { recursive: true });
    const dirEntries = await fsp.readdir(env.dataDir, { withFileTypes: true });

    const files = [];
    for (const entry of dirEntries) {
      // Ignore subdirectories to restrict access to root data files
      if (entry.isFile()) {
        const fullPath = path.join(env.dataDir, entry.name);
        try {
          const stats = await fsp.stat(fullPath);
          files.push({
            id: entry.name,
            name: entry.name,
            size: stats.size // Total file size in bytes
          });
        } catch (err) {
          // Skip unreadable files
          console.warn(`[FilesService] Skipping unreadable file ${entry.name}:`, err.message);
        }
      }
    }

    // Sort alphabetically by name
    files.sort((a, b) => a.name.localeCompare(b.name));
    return files;
  }

  /**
   * Retrieves metadata (name, size) for a specific file.
   */
  static async getFileMetadata(fileId) {
    const { safeName, fullPath } = this.resolveSafeFilePath(fileId);

    try {
      const stats = await fsp.stat(fullPath);
      if (!stats.isFile()) {
        throw new AppError("Requested path is not a regular file", 404);
      }

      return {
        id: safeName,
        name: safeName,
        size: stats.size
      };
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new AppError(`File "${safeName}" not found`, 404);
      }
      throw err;
    }
  }

  /**
   * Creates a readable stream for a specific byte range of a file.
   */
  static async getFileChunkStream(fileId, rawOffset, rawLength) {
    const { safeName, fullPath } = this.resolveSafeFilePath(fileId);
    const offset = Number(rawOffset);
    const length = Number(rawLength);

    let stats;
    try {
      stats = await fsp.stat(fullPath);
      if (!stats.isFile()) {
        throw new AppError("Requested path is not a regular file", 404);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new AppError(`File "${safeName}" not found`, 404);
      }
      throw err;
    }

    const fileSize = stats.size;

    // Edge case: Empty file or offset is beyond EOF
    if (fileSize === 0 || offset >= fileSize) {
      return {
        stream: null,
        contentLength: 0,
        fileSize,
        rangeHeader: `bytes */${fileSize}`,
        isEof: true
      };
    }

    // Clamp range so it never extends past the end of the file
    const end = Math.min(offset + length - 1, fileSize - 1);
    const contentLength = end - offset + 1;

    // Create OS file stream for exact byte range
    const stream = fs.createReadStream(fullPath, {
      start: offset,
      end: end
    });

    return {
      stream,
      contentLength,
      fileSize,
      rangeHeader: `bytes ${offset}-${end}/${fileSize}`,
      isEof: false
    };
  }
}
