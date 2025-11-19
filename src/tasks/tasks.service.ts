import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TaskData } from '../_common/types/task.types';
import { QueueService } from '../queue/queue.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';

@Injectable()
export class TasksService {
  constructor(private readonly queueService: QueueService) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<TaskResponseDto> {
    const taskId = uuidv4();
    const task: TaskData = {
      id: taskId,
      method: createTaskDto.method,
      url: createTaskDto.url,
      callbackUrl: createTaskDto.callbackUrl,
      headers: createTaskDto.headers,
      body: createTaskDto.body,
      queryParams: createTaskDto.queryParams,
      timeout: createTaskDto.timeout,
      maxRetries: createTaskDto.maxRetries,
      retryDelay: createTaskDto.retryDelay,
      createdAt: new Date().toISOString(),
      shouldBeSequential: createTaskDto.shouldBeSequential,
    };

    await this.queueService.addTask(task);

    return {
      taskId,
      status: 'queued',
      createdAt: task.createdAt,
    };
  }
}
