/**
 * Operational error class for predictable client errors (404 Not Found,
 * 400 Bad Request, range limits, path validation).
 *
 * Operational errors are expected and safe to format for client consumption,
 * whereas non-operational errors indicate unexpected runtime faults.
 */
export class AppError extends Error {
  statusCode;
  status;
  isOperational;
  details;

  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
