import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';

@Module({
  imports: [
    UsersModule,
    WalletsModule,
    TransactionsModule,
    PaymentsModule,
    AuditModule,
  ],
  providers: [FundsService],
  controllers: [FundsController],
  exports: [FundsService],
})
export class FundsModule {}
