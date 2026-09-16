import { z } from "zod";

export const getFilesSchema = {};

export const getFileMetadataSchema = {
  params: z.object({
    id: z.string().min(1, "File ID is required")
  })
};

export const getFileChunkSchema = {
  params: z.object({
    id: z.string().min(1, "File ID is required")
  }),
  query: z.object({
    offset: z.coerce
      .number({ required_error: "offset is required" })
      .int("offset must be an integer")
      .nonnegative("offset must be >= 0"),
    length: z.coerce
      .number({ required_error: "length is required" })
      .int("length must be an integer")
      .positive("length must be > 0")
      .max(1048576, "Maximum chunk length is 1 MB (1048576 bytes)")
  })
};
