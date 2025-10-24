import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const fundsOperationSchema = z.object({
  amount: z
    .string()
    .refine((value) => amountPattern.test(value), {
      message: 'Amount must be a positive decimal number with up to two fraction digits',
    }),
  currency: z
    .string()
    .length(3, { message: 'Currency must be a 3-letter ISO code' })
    .optional()
    .transform((value) => value?.toUpperCase()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1).max(64).optional(),
});

export class FundsOperationDto extends createZodDto(fundsOperationSchema) {}
