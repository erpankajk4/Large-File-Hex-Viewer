/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * next(err) - triggering the global error handler middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
