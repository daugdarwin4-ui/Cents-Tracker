/**
 * Global error handler middleware.
 * Must be the last middleware registered in server.js.
 */
module.exports = function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.message || err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
};
