import { Transaction, Wallet } from '@prisma/client';

export interface WalletResponse {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionResponse {
  id: string;
  walletId: string;
  type: Transaction['type'];
  status: Transaction['status'];
  amount: string;
  currency: string;
  externalReference: string | null;
  processor: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export const toWalletResponse = (wallet: Wallet): WalletResponse => ({
  id: wallet.id,
  userId: wallet.userId,
  balance: wallet.balance.toFixed(2),
  currency: wallet.currency,
  version: wallet.version,
  createdAt: wallet.createdAt.toISOString(),
  updatedAt: wallet.updatedAt.toISOString(),
});

export const toTransactionResponse = (
  transaction: Transaction,
): TransactionResponse => ({
  id: transaction.id,
  walletId: transaction.walletId,
  type: transaction.type,
  status: transaction.status,
  amount: transaction.amount.toFixed(2),
  currency: transaction.currency,
  externalReference: transaction.externalReference ?? null,
  processor: transaction.processor ?? null,
  occurredAt: transaction.occurredAt.toISOString(),
  createdAt: transaction.createdAt.toISOString(),
  updatedAt: transaction.updatedAt.toISOString(),
});
