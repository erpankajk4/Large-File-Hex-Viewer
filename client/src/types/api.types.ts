export interface FileItem {
  id: string;
  name: string;
  size: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
}
