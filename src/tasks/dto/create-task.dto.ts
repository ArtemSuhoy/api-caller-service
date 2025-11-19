import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { VALIDATION_CONSTRAINTS } from '../../_common/constants/default-values.constants';
import { HttpMethod } from 'src/_common/types/http.types';

export class CreateTaskDto {
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @IsUrl({ require_protocol: true })
  url: string;

  @IsUrl({ require_protocol: true })
  callbackUrl: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  body?: unknown;

  @IsOptional()
  @IsObject()
  queryParams?: Record<string, string | number>;

  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_CONSTRAINTS.MIN_TIMEOUT)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_CONSTRAINTS.MIN_MAX_RETRIES)
  @Max(VALIDATION_CONSTRAINTS.MAX_MAX_RETRIES)
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_CONSTRAINTS.MIN_RETRY_DELAY)
  retryDelay?: number;

  @IsOptional()
  @IsBoolean()
  shouldBeSequential?: boolean;
}
