import app from "./src/app.js";
import { env } from "./src/config/env.config.js";

const server = app.listen(env.port, () => {
  console.log("==================================================");
  console.log("  Large-File Hex Viewer — High-Performance Server ");
  console.log("==================================================");
  console.log(`[INFO] Server running on:    http://localhost:${env.port}`);
  console.log(`[INFO] Health check:         http://localhost:${env.port}/health`);
  console.log(`[INFO] API files endpoint:   http://localhost:${env.port}/api/files`);
  console.log(`[INFO] Serving data dir:     ${env.dataDir}`);
  console.log("==================================================");
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("[INFO] SIGTERM signal received. Closing server gracefully...");
  server.close(() => {
    console.log("[INFO] HTTP server closed.");
    process.exit(0);
  });
});
