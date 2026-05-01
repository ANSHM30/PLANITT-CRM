const COOKIE_NAME = "crm_access_token";
const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getAuthCookieName() {
  return COOKIE_NAME;
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    maxAge: ONE_WEEK_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  });
}
