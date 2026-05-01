export function notFoundHandler(_req, res) {
  return res.status(404).json({ error: "Resource not found" });
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = Number.isInteger(err?.status) ? err.status : 500;
  const publicMessage = statusCode >= 500 ? "Internal server error" : err?.message || "Request failed";

  if (statusCode >= 500) {
    console.error("Unhandled server error:", err);
  }

  return res.status(statusCode).json({ error: publicMessage });
}

export function sendSafeError(res, err, fallbackMessage = "Request failed") {
  const statusCode = Number.isInteger(err?.status) ? err.status : 500;
  const message = statusCode >= 500 ? fallbackMessage : err?.message || fallbackMessage;
  if (statusCode >= 500) {
    console.error("Controller error:", err);
  }
  return res.status(statusCode).json({ error: message });
}
