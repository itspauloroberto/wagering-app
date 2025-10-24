import { Module } from '@nestjs/common';
import { WalletsModule } from '../wallets/wallets.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [WalletsModule],
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
