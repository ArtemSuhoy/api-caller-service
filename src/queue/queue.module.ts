import { Module } from '@nestjs/common';
import { CallbackModule } from '../callback/callback.module';
import { HttpModule } from '../http/http.module';
import { RedisModule } from '../redis/redis.module';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';

@Module({
  imports: [HttpModule, CallbackModule, RedisModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
