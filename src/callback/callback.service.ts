import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_CALLBACK_VALUES } from '../_common/constants/default-values.constants';
import { CallbackPayload } from '../_common/types/callback.types';
import { response } from 'express';
import { AxiosRequestConfig } from 'axios';
import { handleError } from 'src/_common/helpers/handle-error';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendCallback(
    callbackUrl: string,
    payload: CallbackPayload,
  ): Promise<void> {
    const timeout = this.configService.get<number>(
      'CALLBACK_TIMEOUT',
      DEFAULT_CALLBACK_VALUES.TIMEOUT,
    );
    const maxRetries = this.configService.get<number>(
      'CALLBACK_MAX_RETRIES',
      DEFAULT_CALLBACK_VALUES.MAX_RETRIES,
    );
    const retryDelay = this.configService.get<number>(
      'CALLBACK_RETRY_DELAY',
      DEFAULT_CALLBACK_VALUES.RETRY_DELAY,
    );

    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      try {
        this.logger.log(callbackUrl, 'CALLBACK URL');
        await firstValueFrom(
          this.httpService.post(callbackUrl, payload, {
            timeout,
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

        const config: AxiosRequestConfig | null =
          !!response && 'config' in response
            ? (response.config as AxiosRequestConfig)
            : null;

        const url: string = config?.url ?? '';
        const hostname = url ? new URL(url).hostname : '*unknown url*';

        this.logger.error(
          `Callback attempt ${attempts} failed for task ${payload.taskId} on server ${hostname}: ${error.message}`,
        );

        if (attempts >= maxRetries) {
          this.logger.error(
            `Failed to send callback after ${maxRetries} attempts for task ${payload.taskId}`,
          );
          return;
        }

        await this.sleep(retryDelay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
