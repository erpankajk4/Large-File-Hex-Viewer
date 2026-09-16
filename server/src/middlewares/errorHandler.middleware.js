import { env } from "../config/env.config.js";

/**
 * Global centralized error handler middleware.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  const response = {
    success: false,
    message: isOperational ? err.message : "Internal server error",
    ...(err.details && { details: err.details }),
    ...(env.nodeEnv === "development" && !isOperational && { stack: err.stack })
  };

  if (!isOperational) {
    console.error("[Unhandled Error]:", err);
  }

  res.status(statusCode).json(response);
}
