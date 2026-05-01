import { normalizeErrorMessage } from "./error-message";

const FALLBACK_API_ORIGIN = "http://localhost:5000";

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const apiProtocol = protocol === "https:" ? "https:" : "http:";
    return `${apiProtocol}//${hostname}:5000/api`;
  }

  return `${FALLBACK_API_ORIGIN}/api`;
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${normalizedPath}`;
}

type ApiError = Error & {
  status?: number;
};

async function request(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    const networkError = new Error(
      `Unable to reach API at ${resolveApiBaseUrl()}. Check that backend server is running and NEXT_PUBLIC_API_URL is correct.`
    ) as ApiError;
    networkError.status = 0;
    networkError.cause = error;
    throw networkError;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = normalizeErrorMessage(
      (payload as { error?: unknown } | null)?.error,
      `API request failed with status ${response.status}`
    );
    const error = new Error(errorMessage) as ApiError;

    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await request(buildApiUrl(path), {
    cache: "no-store",
    credentials: "include",
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await request(buildApiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await request(buildApiUrl(path), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await request(buildApiUrl(path), {
    method: "DELETE",
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  return parseResponse<T>(response);
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  const response = await request(buildApiUrl(path), {
    method: "POST",
    credentials: "include",
    body,
  });

  return parseResponse<T>(response);
}
