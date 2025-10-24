import { Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';

@Module({
  providers: [AuditLogRepository, AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
