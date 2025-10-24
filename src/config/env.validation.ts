import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APP_PORT: z.coerce.number().int().min(0).default(3000),
    APP_NAME: z.string().default('Wagers API'),
    DATABASE_URL: z.string().nonempty(),
    STRIPE_SECRET_KEY: z.string().nonempty(),
    STRIPE_WEBHOOK_SECRET: z.string().nonempty(),
  })
  .transform((value) => ({
    ...value,
    isProduction: value.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof envSchema>;
