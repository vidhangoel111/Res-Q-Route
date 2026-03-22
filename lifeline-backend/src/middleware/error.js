function notFound(req, res) {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    return res.status(statusCode).json({
      message,
      stack: error.stack,
    });
  }

  return res.status(statusCode).json({ message });
}

module.exports = {
  notFound,
  errorHandler,
};
