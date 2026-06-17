import { useAuth } from "../features/auth/AuthContext.tsx";

const API_BASE = "/api";

export class HttpError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new HttpError(response.status, data.error || "Something went wrong", data);
  }

  return data;
}

export function useApi() {
  const { token, logout, refresh } = useAuth();

  const call = async (endpoint: string, options: RequestInit = {}) => {
    try {
      return await fetchApi(endpoint, options, token);
    } catch (err: any) {
      if (err instanceof HttpError && err.status === 401) {
        try {
          const newToken = await refresh();
          return await fetchApi(endpoint, options, newToken);
        } catch (refreshErr) {
          logout();
          throw err;
        }
      }
      throw err;
    }
  };

  return { call };
}
