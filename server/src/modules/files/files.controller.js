import { FilesService } from "./files.service.js";
import { sendSuccess } from "../../shared/http/apiResponse.js";

/**
 * Controller handling file inspection endpoints.
 *
 * Binary streaming considerations:
 * Streams raw binary (application/octet-stream) instead of JSON/Base64 to eliminate
 * serialization overhead and allow direct zero-copy ArrayBuffer instantiation on the client.
 */
export class FilesController {
  /**
   * GET /api/files
   */
  static async listFiles(req, res) {
    const files = await FilesService.listFiles();
    sendSuccess(res, { data: files });
  }

  /**
   * GET /api/files/:id/meta
   */
  static async getMetadata(req, res) {
    const metadata = await FilesService.getFileMetadata(req.params.id);
    sendSuccess(res, { data: metadata });
  }

  /**
   * GET /api/files/:id/chunk?offset=...&length=...
   */
  static async getChunk(req, res, next) {
    const { id } = req.params;
    const { offset, length } = req.query;

    const chunkInfo = await FilesService.getFileChunkStream(id, offset, length);

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Length": String(chunkInfo.contentLength),
      "Content-Range": chunkInfo.rangeHeader,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, immutable"
    });

    if (chunkInfo.isEof || chunkInfo.contentLength === 0) {
      return res.status(200).end();
    }

    res.status(200);

    // Handle stream errors (e.g. client disconnects mid-stream)
    chunkInfo.stream.on("error", (err) => {
      console.error(`[Stream Error] file ${id} offset ${offset}:`, err.message);
      if (!res.headersSent) {
        next(err);
      }
    });

    // Pipe binary stream directly into the HTTP response socket
    chunkInfo.stream.pipe(res);
  }
}
