import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrismaClientOrTransaction } from '../../common/types/prisma.types';

export interface CreateAuditLogPayload {
  userId?: string | null;
  walletId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  context?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaClientOrTransaction) {
    return (tx ?? this.prisma) as Prisma.TransactionClient;
  }

  create(
    payload: CreateAuditLogPayload,
    tx?: PrismaClientOrTransaction,
  ): Promise<AuditLog> {
    const client = this.getClient(tx);
    return client.auditLog.create({
      data: {
        userId: payload.userId,
        walletId: payload.walletId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        context: payload.context,
      },
    });
  }
}
