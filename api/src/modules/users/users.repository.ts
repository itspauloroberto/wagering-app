import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrismaClientOrTransaction } from '../../common/types/prisma.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaClientOrTransaction) {
    return (tx ?? this.prisma) as Prisma.TransactionClient;
  }

  findById(id: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.user.findUnique({ where: { id } });
  }

  findByEmail(email: string, tx?: PrismaClientOrTransaction) {
    const client = this.getClient(tx);
    return client.user.findUnique({ where: { email } });
  }

  async create(
    data: Prisma.UserCreateInput,
    tx?: PrismaClientOrTransaction,
  ): Promise<User> {
    const client = this.getClient(tx);
    return client.user.create({ data });
  }

  async upsertByEmail(
    email: string,
    data: Prisma.UserCreateInput,
    tx?: PrismaClientOrTransaction,
  ): Promise<User> {
    const client = this.getClient(tx);
    return client.user.upsert({
      where: { email },
      create: data,
      update: data,
    });
  }
}
