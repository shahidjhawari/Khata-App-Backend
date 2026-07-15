/**
 * Consistent JSON response shape used across the whole API.
 * success: boolean
 * message: string
 * data: any
 */
const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

module.exports = { sendResponse };
