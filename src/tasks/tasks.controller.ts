import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TasksService } from './tasks.service';
import { QueueService } from 'src/queue/queue.service';
import { OperationResult } from 'src/_common/types/operation-result.types';
import { handleError } from 'src/_common/helpers/handle-error';

@Controller('api/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly queueService: QueueService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    try {
      return await this.tasksService.createTask(createTaskDto);
    } catch (error) {
      console.error('❌ Failed to create task', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const { message } = handleError(error);

      throw new HttpException(
        { message: 'Failed to create task', error: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteTask(@Param('id') jobId: string): Promise<OperationResult> {
    try {
      const jobById = await this.queueService.getJob(jobId);

      if (!jobById) {
        throw new HttpException(
          { success: false, message: `Job with id=${jobId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      return await this.queueService.removeJob(jobById);
    } catch (error) {
      console.error(`❌ Failed to delete job with id=${jobId}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      const { message } = handleError(error);

      throw new HttpException(
        {
          message: `Failed to delete job with id=${jobId}`,
          error: message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
