// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

function errorHandler(error, req, res, next) {
  console.error("==========================================");

  console.error("SERVER ERROR");

  console.error(error);

  console.error("==========================================");

  // ----------------------------------------------------------
  // Response already sent
  // ----------------------------------------------------------

  if (res.headersSent) {
    return next(error);
  }

  // ----------------------------------------------------------
  // STATUS CODE
  // ----------------------------------------------------------

  const statusCode = error.statusCode || 500;

  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  return res.status(statusCode).json({
    success: false,

    message: error.message || "Internal server error",
  });
}

// ============================================================
// EXPORT FUNCTION DIRECTLY
// ============================================================

module.exports = errorHandler;
