import { FinishedStatus } from 'bullmq';
import { HttpResponse } from './http.types';

export interface CallbackPayload {
  taskId: string;
  status: FinishedStatus;
  attempts: number;
  response?: HttpResponse;
  error?: {
    message: string;
    code: string;
    httpStatus?: number;
  };
  executionTime: number;
  timestamp: string;
}
