export class HttpError extends Error {
  public readonly code?: number;

  public readonly response?: {
    status: number;
    headers?: Record<string, unknown>;
  };

  constructor(
    message: string,
    code?: number,
    response?: {
      status: number;
      headers?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.response = response;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
