import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env file
dotenv.config();

// Determine repository root and data directory
// If running from ./server, process.cwd() is .../Large-File-Hex-Viewer/server
// If running from root, process.cwd() is .../Large-File-Hex-Viewer
let dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  const parentDataDir = path.resolve(process.cwd(), "..", "data");
  if (fs.existsSync(parentDataDir)) {
    dataDir = parentDataDir;
  }
}

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  dataDir: dataDir
};
