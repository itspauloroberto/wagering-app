import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;
let loggerConfigured = false;

export type TelemetryExporter = 'console' | 'otlp';

export interface TelemetryOptions {
  serviceName: string;
  enabled?: boolean;
  exporter?: TelemetryExporter;
  otlpEndpoint?: string;
  logLevel?: DiagLogLevel;
}

export async function initTelemetry(options: TelemetryOptions): Promise<void> {
  const {
    serviceName,
    enabled = true,
    exporter,
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    logLevel,
  } = options;

  const resolvedLogLevel = inferLogLevel(logLevel);
  if (!loggerConfigured && resolvedLogLevel !== undefined) {
    diag.setLogger(new DiagConsoleLogger(), resolvedLogLevel);
    loggerConfigured = true;
  }

  if (!enabled || sdk) {
    return;
  }

  const resolvedExporter = resolveExporter(exporter, otlpEndpoint);

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    spanProcessor: new BatchSpanProcessor(resolvedExporter),
  });

  await sdk.start();

  process.once('SIGTERM', () => {
    void shutdownTelemetry();
  });

  process.once('SIGINT', () => {
    void shutdownTelemetry();
  });
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
  } catch (error) {
    diag.error('Failed to shut down telemetry', error as Error);
  } finally {
    sdk = undefined;
  }
}

function resolveExporter(
  exporter: TelemetryExporter | undefined,
  otlpEndpoint?: string,
): SpanExporter {
  const choice = inferExporter(exporter);

  if (choice === 'otlp') {
    return new OTLPTraceExporter({ url: otlpEndpoint });
  }

  return new ConsoleSpanExporter();
}

function inferExporter(choice?: TelemetryExporter): TelemetryExporter {
  if (choice) {
    return choice;
  }

  const fromEnv = (process.env.OTEL_TRACES_EXPORTER ?? '').toLowerCase();
  if (fromEnv === 'otlp') {
    return 'otlp';
  }

  return 'console';
}

function inferLogLevel(level?: DiagLogLevel): DiagLogLevel | undefined {
  if (level !== undefined) {
    return level;
  }

  const fromEnv = (process.env.OTEL_LOG_LEVEL ?? '').toUpperCase();
  if (!fromEnv) {
    return undefined;
  }

  const enumKey = fromEnv as keyof typeof DiagLogLevel;
  const value = (DiagLogLevel as unknown as Record<string, unknown>)[enumKey];
  if (typeof value === 'number') {
    return value as DiagLogLevel;
  }

  return undefined;
}
