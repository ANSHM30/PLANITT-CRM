import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyGoogleIdToken(idToken, audience) {
  if (!idToken) {
    throw new Error("Missing Google ID token.");
  }

  if (!audience) {
    throw new Error("Missing Google client ID for token verification.");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience,
  });

  if (!GOOGLE_ISSUERS.has(String(payload.iss ?? ""))) {
    throw new Error("Invalid Google token issuer.");
  }

  return payload;
}
