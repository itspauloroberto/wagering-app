import { envSchema } from './env.validation';

export type AppConfig = ReturnType<typeof configuration>;

export function configuration() {
  const parsed = envSchema.parse(process.env);

  return {
    env: parsed,
    app: {
      name: parsed.APP_NAME,
      port: parsed.APP_PORT,
      nodeEnv: parsed.NODE_ENV,
      isProduction: parsed.isProduction,
    },
    database: {
      url: parsed.DATABASE_URL,
    },
    stripe: {
      secretKey: parsed.STRIPE_SECRET_KEY,
      webhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
    },
  };
}
