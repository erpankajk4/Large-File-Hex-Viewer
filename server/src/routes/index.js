import { Router } from "express";
import { v1Router } from "./v1.router.js";
import { filesRouter } from "../modules/files/index.js";
import { sendSuccess } from "../shared/http/apiResponse.js";

const rootRouter = Router();

// Health check endpoint
rootRouter.get("/health", (req, res) => {
  sendSuccess(res, {
    message: "Large-File Hex Viewer Server is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// Core file endpoints: /api/files
rootRouter.use("/api/files", filesRouter);

// Versioned API namespace: /api/v1
rootRouter.use("/api/v1", v1Router);

export { rootRouter };
