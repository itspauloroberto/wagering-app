import { Prisma } from '@prisma/client';

export interface PaymentChargeRequest {
  userId: string;
  walletId: string;
  amount: Prisma.Decimal;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentChargeResponse {
  id: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: Prisma.Decimal;
  currency: string;
  processor: string;
  raw: Record<string, unknown>;
}

export interface PaymentPayoutRequest {
  userId: string;
  walletId: string;
  amount: Prisma.Decimal;
  currency: string;
  destination?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentPayoutResponse {
  id: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: Prisma.Decimal;
  currency: string;
  processor: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  createDeposit(request: PaymentChargeRequest): Promise<PaymentChargeResponse>;
  createWithdrawal(
    request: PaymentPayoutRequest,
  ): Promise<PaymentPayoutResponse>;
}
