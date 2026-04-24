import { getToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type ApiError = Error & {
  status?: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(
      (payload as { error?: string } | null)?.error ??
        `API request failed with status ${response.status}`
    ) as ApiError;

    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: getToken()
      ? {
          Authorization: `Bearer ${getToken()}`,
        }
      : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken()
        ? {
            Authorization: `Bearer ${getToken()}`,
          }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(getToken()
        ? {
            Authorization: `Bearer ${getToken()}`,
          }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: getToken()
      ? {
          Authorization: `Bearer ${getToken()}`,
        }
      : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  return parseResponse<T>(response);
}
