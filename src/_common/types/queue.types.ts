import { Queue } from 'bullmq';
import { HttpError, HttpResponse } from './http.types';
import { TaskData } from './task.types';

export type QueueType = Queue<TaskData, HttpError | HttpResponse>;
