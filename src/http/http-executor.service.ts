import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_RANGES,
  NETWORK_ERROR_CODES,
} from '../_common/constants/error-codes.constants';
import { DEFAULT_HTTP_VALUES } from '../_common/constants/default-values.constants';
import { HttpError } from '../_common/errors/http.error';
import { HttpResponse } from '../_common/types/http.types';
import { TaskData } from '../_common/types/task.types';

@Injectable()
export class HttpExecutorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async executeRequest(task: TaskData): Promise<HttpResponse> {
    const timeout =
      task.timeout ||
      this.configService.get<number>(
        'DEFAULT_TIMEOUT',
        DEFAULT_HTTP_VALUES.TIMEOUT,
      );

    const url = this.buildUrl(task.url, task.queryParams);
    const config: AxiosRequestConfig = {
      timeout,
      headers: task.headers || {},
      validateStatus: () => true,
    };

    let response: AxiosResponse<unknown>;

    try {
      switch (task.method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(url, config));
          break;
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, task.body, config),
          );
          break;
        case 'PUT':
          response = await firstValueFrom(
            this.httpService.put(url, task.body, config),
          );
          break;
        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, task.body, config),
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(url, config));
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${task.method}`);
      }

      // Checks client errors (4xx)
      if (
        !!response &&
        'status' in response &&
        response.status >= HTTP_STATUS_RANGES.CLIENT_ERROR_START &&
        response.status < HTTP_STATUS_RANGES.CLIENT_ERROR_END &&
        response.status !== (HttpStatus.TOO_MANY_REQUESTS as number)
      ) {
        throw new HttpError(
          `Request failed with status code ${response.status}`,
          undefined,
          {
            status: response.status,
            headers: response.headers,
          },
        );
      }

      return {
        statusCode: response.status,
        headers: this.formatHeaders(response.headers),
        body: response.data,
      };
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        throw error;
      }

      const axiosError = error as { code?: string; message?: string };
      if (
        axiosError.code === NETWORK_ERROR_CODES.ECONNABORTED ||
        axiosError.message?.includes('timeout')
      ) {
        throw new HttpError(
          ERROR_MESSAGES.REQUEST_TIMEOUT,
          NETWORK_ERROR_CODES.ETIMEDOUT,
        );
      }

      throw new HttpError(
        axiosError.message || ERROR_MESSAGES.REQUEST_FAILED,
        axiosError.code || ERROR_CODES.UNKNOWN_ERROR,
      );
    }
  }

  private buildUrl(
    url: string,
    queryParams?: Record<string, string | number>,
  ): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return url;
    }

    const urlObj = new URL(url);
    Object.entries(queryParams).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });

    return urlObj.toString();
  }

  private formatHeaders(
    headers: Record<string, unknown> | undefined,
  ): Record<string, string> {
    const formatted: Record<string, string> = {};

    if (headers) {
      Object.keys(headers).forEach((key) => {
        formatted[key.toLowerCase()] = String(headers[key]);
      });
    }

    return formatted;
  }
}
