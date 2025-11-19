import { NestFactory } from '@nestjs/core';
import { DEFAULT_SERVER_VALUES } from './_common/constants/default-values.constants';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : DEFAULT_SERVER_VALUES.PORT;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
