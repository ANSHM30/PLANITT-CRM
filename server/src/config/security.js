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

export function getAllowedCorsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? "";
  const configured = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_LOCAL_ORIGINS;
  }

  throw new Error("CORS_ORIGINS must be configured in production.");
}
