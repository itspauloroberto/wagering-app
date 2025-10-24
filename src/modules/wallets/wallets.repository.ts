import { Injectable } from '@nestjs/common';
import { Prisma, Wallet } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrismaClientOrTransaction } from '../../common/types/prisma.types';

@Injectable()
export class WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaClientOrTransaction) {
    return (tx ?? this.prisma) as Prisma.TransactionClient;
  }

  findById(id: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.wallet.findUnique({ where: { id } });
  }

  findByUserId(userId: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.wallet.findUnique({ where: { userId } });
  }

  async createForUser(
    userId: string,
    tx?: PrismaClientOrTransaction,
  ): Promise<Wallet> {
    const client = this.getClient(tx);
    return client.wallet.create({
      data: {
        userId,
      },
    });
  }

  async incrementBalance(
    walletId: string,
    amount: Prisma.Decimal,
    tx?: PrismaClientOrTransaction,
  ): Promise<Wallet> {
    const client = this.getClient(tx);
    return client.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
        version: { increment: 1 },
      },
    });
  }

  async decrementBalance(
    walletId: string,
    amount: Prisma.Decimal,
    tx?: PrismaClientOrTransaction,
  ): Promise<Wallet> {
    const client = this.getClient(tx);
    return client.wallet.update({
      where: { id: walletId },
      data: {
        balance: { decrement: amount },
        version: { increment: 1 },
      },
    });
  }
}
