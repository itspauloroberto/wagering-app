import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrismaClientOrTransaction } from '../../common/types/prisma.types';

export interface CreateTransactionPayload {
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: Prisma.Decimal;
  currency: string;
  externalReference?: string | null;
  processor?: string | null;
  processorPayload?: Prisma.InputJsonValue;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaClientOrTransaction) {
    return (tx ?? this.prisma) as Prisma.TransactionClient;
  }

  create(payload: CreateTransactionPayload, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.transaction.create({
      data: {
        walletId: payload.walletId,
        type: payload.type,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        externalReference: payload.externalReference,
        processor: payload.processor,
        processorPayload: payload.processorPayload,
        idempotencyKey: payload.idempotencyKey,
        metadata: payload.metadata,
      },
    });
  }

  updateStatus(
    id: string,
    status: TransactionStatus,
    tx?: PrismaClientOrTransaction,
  ): Promise<Transaction> {
    const client = this.getClient(tx);
    return client.transaction.update({
      where: { id },
      data: {
        status,
      },
    });
  }

  findById(id: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.transaction.findUnique({ where: { id } });
  }

  listByWallet(walletId: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.transaction.findMany({
      where: { walletId },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
