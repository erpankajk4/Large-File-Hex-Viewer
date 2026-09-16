import { Router } from "express";
import { FilesController } from "./files.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import {
  getFilesSchema,
  getFileMetadataSchema,
  getFileChunkSchema
} from "./files.schema.js";

const router = Router();

// 1. List available files: GET /api/files
router.get(
  "/",
  validate(getFilesSchema),
  asyncHandler(FilesController.listFiles)
);

// 2. File metadata: GET /api/files/:id/meta
router.get(
  "/:id/meta",
  validate(getFileMetadataSchema),
  asyncHandler(FilesController.getMetadata)
);

// 3. Read a byte range: GET /api/files/:id/chunk?offset=...&length=...
router.get(
  "/:id/chunk",
  validate(getFileChunkSchema),
  asyncHandler(FilesController.getChunk)
);

export const filesRouter = router;
