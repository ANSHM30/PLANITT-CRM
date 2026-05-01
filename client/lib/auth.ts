const AUTH_EVENT = "crm-auth-changed";

export function getToken() {
  return null;
}

export function setToken(_token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAuthEventName() {
  return AUTH_EVENT;
}
