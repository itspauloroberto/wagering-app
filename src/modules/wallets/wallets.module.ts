import { Module } from '@nestjs/common';
import { WalletsRepository } from './wallets.repository';
import { WalletsService } from './wallets.service';

@Module({
  providers: [WalletsRepository, WalletsService],
  exports: [WalletsService, WalletsRepository],
})
export class WalletsModule {}
