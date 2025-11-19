import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DEFAULT_HTTP_VALUES } from '../_common/constants/default-values.constants';
import { HttpExecutorService } from './http-executor.service';

@Module({
  imports: [
    NestHttpModule.register({
      timeout: DEFAULT_HTTP_VALUES.TIMEOUT,
      maxRedirects: DEFAULT_HTTP_VALUES.MAX_REDIRECTS,
    }),
  ],
  providers: [HttpExecutorService],
  exports: [HttpExecutorService],
})
export class HttpModule {}
