import { Controller, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { QueueService } from './queue.service';
import { OperationResult } from 'src/_common/types/operation-result.types';

@Controller('api/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Delete()
  async clearQueue(): Promise<OperationResult> {
    try {
      return await this.queueService.clearQueue(['completed', 'failed']);
    } catch (error) {
      console.error(`❌ Failed to clear jobs queue`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: `Failed to clear jobs queue`,
          error: error instanceof Error ? error : null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
