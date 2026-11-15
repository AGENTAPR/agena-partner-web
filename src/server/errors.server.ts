export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "DOWNSTREAM_UNAVAILABLE"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("TIMEOUT", "Upstream request timed out", 504);
  }
  if (error instanceof TypeError) {
    return new ApiError("DOWNSTREAM_UNAVAILABLE", "Upstream service unreachable", 503);
  }
  return new ApiError("INTERNAL_ERROR", "Unexpected server error", 500);
}

export function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "DOWNSTREAM_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}
