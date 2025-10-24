import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WalletsRepository } from './wallets.repository';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletsRepository: WalletsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findByUserId(userId: string) {
    return this.walletsRepository.findByUserId(userId);
  }

  async getOrCreateForUser(userId: string): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.walletsRepository.findByUserId(userId, tx);
      if (existing) {
        return existing;
      }

      return this.walletsRepository.createForUser(userId, tx);
    });
  }
}
