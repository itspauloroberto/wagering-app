import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientOrTransaction } from '../../common/types/prisma.types';
import {
  AuditLogRepository,
  CreateAuditLogPayload,
} from './audit-log.repository';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(
    payload: CreateAuditLogPayload & { context?: Prisma.InputJsonValue },
    tx?: PrismaClientOrTransaction,
  ) {
    try {
      await this.auditLogRepository.create(payload, tx);
    } catch (error) {
      // We don't want to block business logic if audit log fails, but we should surface the error.
      this.logger.error('Failed to persist audit log', error as Error);
    }
  }
}
