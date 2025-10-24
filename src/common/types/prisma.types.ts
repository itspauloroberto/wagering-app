import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type PrismaTransaction = Prisma.TransactionClient;

export type PrismaClientOrTransaction = PrismaService | PrismaTransaction;
