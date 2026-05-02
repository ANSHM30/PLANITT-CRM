const DEFAULT_LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/+$/, "");
}

export function getAllowedCorsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? "";
  const configured = raw
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  const clientUrl = normalizeOrigin(process.env.CLIENT_URL ?? "");
  if (clientUrl) {
    return [clientUrl];
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_LOCAL_ORIGINS;
  }

  throw new Error("CORS_ORIGINS or CLIENT_URL must be configured in production.");
}
