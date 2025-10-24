import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { AppConfig, configuration } from './config/configuration';
import { initTelemetry } from './telemetry/telemetry';

async function bootstrap() {
  const envConfig = configuration();
  const telemetryEnabled = process.env.ENABLE_TELEMETRY !== 'false';
  await initTelemetry({
    serviceName: envConfig.app.name,
    enabled: telemetryEnabled,
  });

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig>);
  const port = configService.get<number>('app.port', { infer: true }) ?? 3000;

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  await app.listen(port);
}
bootstrap();
