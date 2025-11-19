export interface NormalizedError {
  message: string;
  status: number;
  data?: unknown;
  isAxios: boolean;
}
