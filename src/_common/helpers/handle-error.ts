import { AxiosError } from 'axios';
import { NormalizedError } from '../types/error.types';

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

export function handleError(error: unknown): NormalizedError {
  if (!!error && Array.isArray((error as AggregateError)?.errors)) {
    const aggErrors = (error as AggregateError).errors as unknown[];
    return aggErrors.map((e) => handleError(e))?.[0];
  }

  if (isAxiosError(error)) {
    let message = error.message;
    let data: unknown = undefined;

    if (
      error.response &&
      typeof error.response.data === 'object' &&
      error.response.data !== null
    ) {
      const respData = error.response.data as Record<string, unknown>;
      if (typeof respData.message === 'string') {
        message = respData.message;
      }
      data = respData;
    }

    return {
      isAxios: true,
      message,
      status: error.response?.status ?? 500,
      data,
    };
  }

  if (error instanceof Error) {
    return {
      isAxios: false,
      message: error.message,
      status: (error as { status?: number }).status ?? 500,
    };
  }

  return {
    isAxios: false,
    message: 'Unknown error',
    status: 500,
    data: error,
  };
}
