import { FinishedStatus } from 'bullmq';
import { HttpResponse } from './http.types';
import { NormalizedError } from './error.types';

export interface CallbackPayload {
  taskId: string;
  status: FinishedStatus;
  attempts: number;
  response?: HttpResponse;
  error?: Pick<NormalizedError, 'message' | 'status'>;
  executionTime: number;
  timestamp: string;
}
