/**
 * Standardized API response helpers matching the production architecture contract.
 */
export function sendSuccess(res, options = {}) {
  const { statusCode = 200, data, message } = options;
  res.status(statusCode).json({
    success: true,
    ...(message !== undefined && { message }),
    ...(data !== undefined && { data }),
  });
}

export function sendMessage(res, message, statusCode = 200) {
  sendSuccess(res, {
    statusCode,
    message,
  });
}
