import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { corsOptions } from "./config/cors.config.js";
import { rootRouter } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

// Security middleware (configured to allow binary media and range requests)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP request logger
app.use(morgan("dev"));

// Body parser for JSON
app.use(express.json());

// Mount application routes
app.use(rootRouter);

// 404 handler for unmatched routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;
