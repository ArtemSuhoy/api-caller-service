import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [QueueModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
