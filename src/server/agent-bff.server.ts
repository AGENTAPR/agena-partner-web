import { getBffConfig } from "./env.server";
import { ApiError, normalizeApiError } from "./errors.server";
import type { AppLoadContext } from "react-router";

export interface BffRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  requestId?: string;
  idempotencyKey?: string;
}

const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Server-only client for the Agent BFF.
 * Never import this module from client-side code — it reads server env bindings.
 */
export async function agentBffFetch<T = unknown>(
  context: AppLoadContext,
  path: string,
  options: BffRequestOptions = {},
): Promise<T> {
  const { baseUrl, token, timeoutMs } = getBffConfig(context);
  const method = options.method ?? "GET";
  const requestId = options.requestId ?? crypto.randomUUID();

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Request-Id": requestId,
    ...options.headers,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const isIdempotent = method === "GET";
  let attempt = 0;

  for (;;) {
    attempt += 1;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal,
        // Never cache authenticated upstream responses
        cache: "no-store",
      });
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (isIdempotent && attempt <= MAX_RETRIES && normalized.code === "TIMEOUT") {
        await sleep(200 * attempt);
        continue;
      }
      throw normalized;
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const err = payload as { code?: string; message?: string } | undefined;
      const code =
        response.status === 401
          ? "UNAUTHORIZED"
          : response.status === 403
            ? "FORBIDDEN"
            : response.status === 404
              ? "NOT_FOUND"
              : response.status === 409
                ? "CONFLICT"
                : response.status === 422 || response.status === 400
                  ? "VALIDATION_ERROR"
                  : response.status === 429
                    ? "RATE_LIMITED"
                    : response.status >= 500
                      ? "DOWNSTREAM_UNAVAILABLE"
                      : "INTERNAL_ERROR";
      const apiError = new ApiError(
        code as ConstructorParameters<typeof ApiError>[0],
        err?.message ?? `Upstream responded ${response.status}`,
        response.status,
        payload,
      );

      if (isIdempotent && attempt <= MAX_RETRIES && RETRYABLE_STATUSES.has(response.status)) {
        await sleep(200 * attempt);
        continue;
      }
      throw apiError;
    }

    return payload as T;
  }
}
