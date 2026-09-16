import type { FileItem, ApiResponse, FileMetadata } from "../types/api.types.ts";

const API_BASE = "/api";

export class ApiService {
  /**
   * Retrieves the list of viewable files in the ./data directory.
   */
  static async listFiles(): Promise<FileItem[]> {
    const res = await fetch(`${API_BASE}/files`);
    if (!res.ok) {
      throw new Error(`Failed to list files: ${res.statusText}`);
    }
    const json: ApiResponse<FileItem[]> = await res.json();
    return json.data;
  }

  /**
   * Retrieves metadata (name, size) for a specific file.
   */
  static async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const res = await fetch(`${API_BASE}/files/${encodeURIComponent(fileId)}/meta`);
    if (!res.ok) {
      throw new Error(`Failed to get metadata for ${fileId}: ${res.statusText}`);
    }
    const json: ApiResponse<FileMetadata> = await res.json();
    return json.data;
  }

  /**
   * Fetches a raw binary byte range from the backend as an ArrayBuffer.
   * Direct binary transfer avoids serialization and parsing overhead.
   */
  static async fetchChunk(fileId: string, offset: number, length: number): Promise<Uint8Array> {
    const url = `${API_BASE}/files/${encodeURIComponent(fileId)}/chunk?offset=${offset}&length=${length}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch chunk at offset ${offset}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}
