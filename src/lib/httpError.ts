/** An error carrying the status code it should be reported with. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options?.code ?? "error";
    this.details = options?.details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, { code: "bad_request", details });

export const unauthorized = (message = "You must be signed in.") =>
  new HttpError(401, message, { code: "unauthorized" });

export const forbidden = (message = "You do not have access to this.") =>
  new HttpError(403, message, { code: "forbidden" });

export const notFound = (message = "Not found.") =>
  new HttpError(404, message, { code: "not_found" });

export const conflict = (message: string) =>
  new HttpError(409, message, { code: "conflict" });

export const payloadTooLarge = (message: string) =>
  new HttpError(413, message, { code: "payload_too_large" });
