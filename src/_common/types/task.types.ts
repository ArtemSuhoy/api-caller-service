export interface TaskData {
  id: string;
  method: string;
  url: string;
  callbackUrl: string;
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string | number>;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  createdAt: string;
  shouldBeSequential?: boolean;
}
