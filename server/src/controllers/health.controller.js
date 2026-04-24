export function getHealth(_request, response) {
  response.json({
    message: "CRM API is healthy",
    timestamp: new Date().toISOString(),
  });
}
