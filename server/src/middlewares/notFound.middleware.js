import { AppError } from "../shared/errors/AppError.js";

/**
 * 404 handler for unknown routes.
 */
export function notFound(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
}
