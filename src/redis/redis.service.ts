import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_ERROR_CODES } from '../_common/constants/error-codes.constants';
import { DEFAULT_REDIS_VALUES } from '../_common/constants/default-values.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(
          times * DEFAULT_REDIS_VALUES.RETRY_DELAY_MULTIPLIER,
          DEFAULT_REDIS_VALUES.MAX_RETRY_DELAY,
        );
        this.logger.warn(
          `Redis connection retry attempt ${times}, delay: ${delay}ms`,
        );
        return delay;
      },
      reconnectOnError: (err) => {
        if (err.message.includes(REDIS_ERROR_CODES.READONLY)) {
          this.logger.error('Redis is in read-only mode, reconnecting...');
          return true;
        }
        return false;
      },
      maxRetriesPerRequest: null,
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection...');
    await this.redisClient.quit();
    this.logger.log('Redis connection closed');
  }
}
