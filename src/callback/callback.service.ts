import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_CALLBACK_VALUES } from '../_common/constants/default-values.constants';
import { CallbackPayload } from '../_common/types/callback.types';

import { handleError } from 'src/_common/helpers/handle-error';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.timeout = this.configService.get<number>(
      'CALLBACK_TIMEOUT',
      DEFAULT_CALLBACK_VALUES.TIMEOUT,
    );
    this.maxRetries = this.configService.get<number>(
      'CALLBACK_MAX_RETRIES',
      DEFAULT_CALLBACK_VALUES.MAX_RETRIES,
    );
    this.retryDelay = this.configService.get<number>(
      'CALLBACK_RETRY_DELAY',
      DEFAULT_CALLBACK_VALUES.RETRY_DELAY,
    );
  }

  async sendCallback(
    callbackUrl: string,
    payload: CallbackPayload,
  ): Promise<void> {
    let attempts = 0;

    while (attempts < this.maxRetries) {
      attempts++;

      try {
        await firstValueFrom(
          this.httpService.post(callbackUrl, payload, {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );

        this.logger.log(
          `Callback sent successfully for task ${payload.taskId}`,
        );
        return;
      } catch (e: unknown) {
        const error = handleError(e);

        this.logger.error(
          `Callback attempt ${attempts} failed for task ${payload.taskId} on server: ${error.message}`,
        );

        if (attempts >= this.maxRetries) {
          this.logger.error(
            `Failed to send callback after ${this.maxRetries} attempts for task ${payload.taskId}`,
          );
          return;
        }

        await this.sleep(this.retryDelay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
