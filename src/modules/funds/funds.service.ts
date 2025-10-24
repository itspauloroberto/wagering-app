import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
  Wallet,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import type {
  PaymentProvider,
  PaymentChargeResponse,
  PaymentPayoutResponse,
} from '../payments/payment-provider.interface';
import { PAYMENT_PROVIDER } from '../payments/payment.tokens';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { UsersService } from '../users/users.service';
import { WalletsRepository } from '../wallets/wallets.repository';
import { WalletsService } from '../wallets/wallets.service';
import { InsufficientFundsException } from '../../common/exceptions/insufficient-funds.exception';

export interface FundsOperationInput {
  userId: string;
  amount: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface FundsOperationResult {
  wallet: Wallet;
  transaction: Transaction;
  status: TransactionStatus;
}

@Injectable()
export class FundsService {
  private readonly logger = new Logger(FundsService.name);
  private readonly defaultCurrency: string;

  constructor(
    private readonly walletsService: WalletsService,
    private readonly walletsRepository: WalletsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {
    this.defaultCurrency = 'USD';
  }

  async ensureWalletForUser(userId: string): Promise<Wallet> {
    await this.usersService.getByIdOrFail(userId);
    return this.walletsService.getOrCreateForUser(userId);
  }

  async getWallet(userId: string) {
    return this.ensureWalletForUser(userId);
  }

  async listTransactions(userId: string) {
    const wallet = await this.ensureWalletForUser(userId);
    const transactions = await this.transactionsRepository.listByWallet(
      wallet.id,
    );
    return { wallet, transactions };
  }

  async depositFunds(
    input: FundsOperationInput,
  ): Promise<FundsOperationResult> {
    const wallet = await this.ensureWalletForUser(input.userId);
    const currency = (
      input.currency ??
      wallet.currency ??
      this.defaultCurrency
    ).toUpperCase();
    const amount = this.toDecimal(input.amount);

    this.ensurePositiveAmount(amount);

    const paymentResponse = await this.paymentProvider.createDeposit({
      userId: input.userId,
      walletId: wallet.id,
      amount,
      currency,
      metadata: input.metadata,
    });

    const finalStatus = this.mapPaymentStatus(paymentResponse);

    const { updatedWallet, transaction } = await this.prisma.$transaction(
      async (tx) => {
        const createdTransaction = await this.transactionsRepository.create(
          {
            walletId: wallet.id,
            type: TransactionType.DEPOSIT,
            status: finalStatus,
            amount,
            currency,
            externalReference: paymentResponse.id,
            processor: paymentResponse.processor,
            processorPayload: paymentResponse.raw as Prisma.InputJsonValue,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
          },
          tx,
        );

        let updated = wallet;
        if (finalStatus === TransactionStatus.SUCCEEDED) {
          updated = await this.walletsRepository.incrementBalance(
            wallet.id,
            amount,
            tx,
          );
        }

        await this.auditLogService.log(
          {
            userId: input.userId,
            walletId: wallet.id,
            action: 'wallet.deposit',
            entityType: 'transaction',
            entityId: createdTransaction.id,
            context: {
              currency,
              amount: amount.toString(),
              status: finalStatus,
            },
          },
          tx,
        );

        return {
          updatedWallet: updated,
          transaction: createdTransaction,
        };
      },
    );

    return {
      wallet: updatedWallet,
      transaction,
      status: finalStatus,
    };
  }

  async withdrawFunds(
    input: FundsOperationInput,
  ): Promise<FundsOperationResult> {
    const wallet = await this.ensureWalletForUser(input.userId);
    const currency = (
      input.currency ??
      wallet.currency ??
      this.defaultCurrency
    ).toUpperCase();
    const amount = this.toDecimal(input.amount);

    this.ensurePositiveAmount(amount);

    if (wallet.balance.lt(amount)) {
      throw new InsufficientFundsException();
    }

    const paymentResponse = await this.paymentProvider.createWithdrawal({
      userId: input.userId,
      walletId: wallet.id,
      amount,
      currency,
      metadata: input.metadata,
    });

    const finalStatus = this.mapPayoutStatus(paymentResponse);

    const { updatedWallet, transaction } = await this.prisma.$transaction(
      async (tx) => {
        const createdTransaction = await this.transactionsRepository.create(
          {
            walletId: wallet.id,
            type: TransactionType.WITHDRAWAL,
            status: finalStatus,
            amount,
            currency,
            externalReference: paymentResponse.id,
            processor: paymentResponse.processor,
            processorPayload: paymentResponse.raw as Prisma.InputJsonValue,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
          },
          tx,
        );

        let updated = wallet;
        if (finalStatus === TransactionStatus.SUCCEEDED) {
          updated = await this.walletsRepository.decrementBalance(
            wallet.id,
            amount,
            tx,
          );
        }

        await this.auditLogService.log(
          {
            userId: input.userId,
            walletId: wallet.id,
            action: 'wallet.withdraw',
            entityType: 'transaction',
            entityId: createdTransaction.id,
            context: {
              currency,
              amount: amount.toString(),
              status: finalStatus,
            },
          },
          tx,
        );

        return {
          updatedWallet: updated,
          transaction: createdTransaction,
        };
      },
    );

    return {
      wallet: updatedWallet,
      transaction,
      status: finalStatus,
    };
  }

  private mapPaymentStatus(response: PaymentChargeResponse): TransactionStatus {
    switch (response.status) {
      case 'succeeded':
        return TransactionStatus.SUCCEEDED;
      case 'pending':
        return TransactionStatus.PENDING;
      default:
        return TransactionStatus.FAILED;
    }
  }

  private mapPayoutStatus(response: PaymentPayoutResponse): TransactionStatus {
    switch (response.status) {
      case 'succeeded':
        return TransactionStatus.SUCCEEDED;
      case 'pending':
        return TransactionStatus.PENDING;
      default:
        return TransactionStatus.FAILED;
    }
  }

  private toDecimal(value: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch (error) {
      this.logger.error('Invalid decimal value received', error as Error);
      throw new BadRequestException('Amount must be a valid decimal number');
    }
  }

  private ensurePositiveAmount(amount: Prisma.Decimal) {
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than zero');
    }
  }
}
