import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallbackModule } from './callback/callback.module';
import { HttpModule } from './http/http.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule,
    TasksModule,
    QueueModule,
    HttpModule,
    CallbackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
