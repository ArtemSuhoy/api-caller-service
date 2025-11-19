import {
  HttpStatus,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinishedStatus, Job, Queue, QueueOptions, Worker } from 'bullmq';
import {
  ERROR_MESSAGES,
  HTTP_STATUS_RANGES,
  NETWORK_ERROR_CODES,
} from '../_common/constants/error-codes.constants';
import {
  DEFAULT_TASK_VALUES,
  DEFAULT_QUEUE_VALUES,
} from '../_common/constants/default-values.constants';
import { TaskData } from '../_common/types/task.types';
import { CallbackService } from '../callback/callback.service';
import { HttpExecutorService } from '../http/http-executor.service';
import { RedisService } from '../redis/redis.service';
import Redis from 'ioredis';
import { HttpError } from 'src/_common/errors/http.error';
import { QueueType } from 'src/_common/types/queue.types';
import { OperationResult } from 'src/_common/types/operation-result.types';
import { handleError } from 'src/_common/helpers/handle-error';
import { HttpResponse } from 'src/_common/types/http.types';
import { NormalizedError } from 'src/_common/types/error.types';

const logger = new Logger('QueueService');

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private parallelQueue: QueueType;
  private sequentialQueue: QueueType;

  private parallelWorker: Worker;
  private sequentialWorker: Worker;

  private readonly name = 'process-api-call';

  private parallelConcurrency: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpExecutor: HttpExecutorService,
    private readonly callbackService: CallbackService,
    private readonly redisService: RedisService,
  ) {
    const redisConnection = this.redisService.getClient();

    const options: QueueOptions = {
      connection: redisConnection,
    };

    this.parallelQueue = new Queue(
      DEFAULT_QUEUE_VALUES.PARALLEL_WORKER.NAME,
      options,
    );

    this.sequentialQueue = new Queue(
      DEFAULT_QUEUE_VALUES.SEQUENTIAL_WORKER.NAME,
      options,
    );

    this.parallelConcurrency = +this.configService.get<number>(
      'PARALLEL_WORKER_CONCURRENCY',
      DEFAULT_QUEUE_VALUES.PARALLEL_WORKER.CONCURRENCY,
    );
  }

  onModuleInit() {
    const redisConnection = this.redisService.getClient();

    this.parallelWorker = this.createWorker(
      DEFAULT_QUEUE_VALUES.PARALLEL_WORKER.NAME,
      this.parallelConcurrency,
      redisConnection,
    );

    this.sequentialWorker = this.createWorker(
      DEFAULT_QUEUE_VALUES.SEQUENTIAL_WORKER.NAME,
      DEFAULT_QUEUE_VALUES.SEQUENTIAL_WORKER.CONCURRENCY,
      redisConnection,
    );
  }

  async addTask(task: TaskData): Promise<void> {
    const computedService: QueueType = task.shouldBeSequential
      ? this.sequentialQueue
      : this.parallelQueue;

    await computedService.add(this.name, task, {
      jobId: task.id,
    });
  }

  private async processTask(job: Job<TaskData>): Promise<void> {
    let attempts = 0;
    const task = job.data;
    const startTime = Date.now();
    const maxRetries = task.maxRetries || DEFAULT_TASK_VALUES.MAX_RETRIES;
    const retryDelay = task.retryDelay || DEFAULT_TASK_VALUES.RETRY_DELAY;

    while (attempts < maxRetries) {
      attempts++;

      try {
        const response = await this.httpExecutor.executeRequest(task);
        const executionTime = Date.now() - startTime;
        return this.handleSuccess(task, attempts, response, executionTime);
      } catch (error: unknown) {
        const httpError = handleError(error);
        const shouldRetry = this.shouldRetry(httpError, attempts, maxRetries);

        if (!shouldRetry) {
          const executionTime = Date.now() - startTime;
          await this.handleFailure(task, attempts, httpError, executionTime);
          throw new HttpError(httpError.message);
        }
        const delay = retryDelay * attempts;

        logger.log(
          `Task ${task.id} attempt ${attempts} failed, retrying in ${delay}ms`,
        );
        await this.sleep(delay);
      }
    }
  }

  private createWorker(
    queueName: string,
    concurrency: number,
    connection: Redis,
  ): Worker {
    const options = {
      connection,
      concurrency,
    };

    const worker = new Worker(
      queueName,
      async (job: Job<TaskData>) => this.processTask(job),
      options,
    );

    worker.on('completed', (job) => {
      logger.log(`[${queueName}] Task ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(
        `[${queueName}] Task ${job?.id} failed:`,
        err?.message || 'Unknown error',
      );
    });

    return worker;
  }

  async clearQueue(jobStatuses: FinishedStatus[]): Promise<OperationResult> {
    try {
      const results = await Promise.allSettled([
        this.parallelQueue.drain(),
        this.sequentialQueue.drain(),
        ...jobStatuses.map((status) =>
          Promise.all([
            this.parallelQueue.clean(0, 0, status),
            this.sequentialQueue.clean(0, 0, status),
          ]),
        ),
      ]);

      let allSuccess = true;
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          allSuccess = false;
          logger.error(`❌ Operation ${index} failed`, result.reason);
        }
      });

      if (allSuccess) logger.log('✅ All clear queue operations succeeded');

      return {
        message: 'Queue cleanup successfully',
        success: true,
      };
    } catch (e) {
      logger.error('❌ Failed to clear queues', e);

      const error = handleError(e);

      return {
        message: 'Failed to clear queues',
        error: error.message,
        success: false,
      };
    }
  }

  async getJob(jobId: string): Promise<Job<TaskData> | null> {
    const queues: QueueType[] = [this.sequentialQueue, this.parallelQueue];

    for (const queue of queues) {
      try {
        const job = await queue.getJob(jobId);
        if (job) return job;
      } catch (error) {
        logger.error(
          `Error checking queue ${queue.name} for job ${jobId}`,
          error,
        );
      }
    }

    return null;
  }

  async removeJob(job: Job<TaskData>): Promise<OperationResult> {
    const jobId = job.data.id;
    try {
      await job.remove();
      logger.log(`✅ Job with id=${jobId} removed successfully`);

      return {
        success: true,
        message: `Job with id=${jobId} removed successfully`,
      };
    } catch (error) {
      logger.error(`❌ Failed to remove job with id=${jobId}`, error);
      return {
        success: false,
        message: `Failed to remove job with id=${jobId}`,
        error: handleError(error).message,
      };
    }
  }

  private shouldRetry(
    error: NormalizedError,
    attempts: number,
    maxRetries: number,
  ): boolean {
    const { status } = error;
    if (attempts >= maxRetries) {
      return false;
    }

    if (status === +HttpStatus.TOO_MANY_REQUESTS) {
      return true;
    }

    if (
      status >= HTTP_STATUS_RANGES.SERVER_ERROR_START &&
      status < HTTP_STATUS_RANGES.SERVER_ERROR_END
    ) {
      return true;
    }

    const retriableErrors = [
      NETWORK_ERROR_CODES.ECONNREFUSED,
      NETWORK_ERROR_CODES.ETIMEDOUT,
      NETWORK_ERROR_CODES.ENOTFOUND,
    ];

    if (retriableErrors.some((code) => error.message.includes(code))) {
      return true;
    }

    return false;
  }

  private async handleSuccess(
    task: TaskData,
    attempts: number,
    error: HttpResponse,
    executionTime: number,
  ) {
    await this.callbackService.sendCallback(task.callbackUrl, {
      taskId: task.id,
      status: 'completed',
      attempts,
      response: {
        statusCode: error.statusCode,
        headers: error.headers,
        body: error.body,
      },
      executionTime,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleFailure(
    task: TaskData,
    attempts: number,
    error: NormalizedError,
    executionTime: number,
  ) {
    await this.callbackService.sendCallback(task.callbackUrl, {
      taskId: task.id,
      status: 'failed',
      attempts,
      error: {
        message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
        status: error.status,
      },
      executionTime,
      timestamp: new Date().toISOString(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    await this.parallelWorker.close();
    await this.sequentialWorker.close();
    await this.parallelQueue.close();
    await this.sequentialQueue.close();
    // Redis close in RedisService
  }
}
