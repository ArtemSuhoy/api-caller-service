import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DEFAULT_CALLBACK_VALUES } from '../_common/constants/default-values.constants';
import { CallbackService } from './callback.service';

@Module({
  imports: [
    NestHttpModule.register({
      timeout: DEFAULT_CALLBACK_VALUES.TIMEOUT,
    }),
  ],
  providers: [CallbackService],
  exports: [CallbackService],
})
export class CallbackModule {}
