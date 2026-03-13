import { API_BASE_URL } from "@/lib/constants";
import { clearSession, readSession, writeSession } from "@/lib/auth-storage";
import type { ApiErrorPayload } from "@/types/domain";

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let refreshPromise: Promise<string | null> | null = null;

const readErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = readSession();
    if (!session?.refreshToken) {
      clearSession();
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const payload = (await response.json()) as { token: string };
    const nextSession = { ...session, token: payload.token };
    writeSession(nextSession);
    return payload.token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const send = async (token?: string | null) => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (options.auth !== false) {
      const session = readSession();
      const authToken = token ?? session?.token;
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  };

  let response = await send();

  if (response.status === 401 && options.auth !== false && path !== "/auth/refresh") {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      response = await send(nextToken);
    }
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new ApiError(payload?.message ?? "Erro inesperado na API.", response.status, payload?.details);
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
};
