import { Test } from '@nestjs/testing';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditLogService } from '../audit/audit-log.service';
import { PAYMENT_PROVIDER } from '../payments/payment.tokens';
import type { PaymentProvider } from '../payments/payment-provider.interface';
import {
  CreateTransactionPayload,
  TransactionsRepository,
} from '../transactions/transactions.repository';
import { UsersService } from '../users/users.service';
import { WalletsRepository } from '../wallets/wallets.repository';
import { WalletsService } from '../wallets/wallets.service';
import { FundsService } from './funds.service';
import { PrismaService } from '../../database/prisma.service';
import { InsufficientFundsException } from '../../common/exceptions/insufficient-funds.exception';

describe('FundsService', () => {
  let service: FundsService;
  let walletsServiceMock: { getOrCreateForUser: jest.Mock };
  let walletsRepositoryMock: {
    incrementBalance: jest.Mock;
    decrementBalance: jest.Mock;
  };
  let transactionsRepositoryMock: {
    create: jest.Mock;
    listByWallet: jest.Mock;
  };
  let paymentProviderMock: {
    createDeposit: jest.Mock;
    createWithdrawal: jest.Mock;
  } & PaymentProvider;

  const prismaMock = {
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<any>) =>
      callback({}),
    ),
  } as unknown as PrismaService;

  const baseWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: new Decimal('100.00'),
    currency: 'USD',
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: null,
    lastName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    walletsServiceMock = {
      getOrCreateForUser: jest.fn().mockResolvedValue({ ...baseWallet }),
    };

    walletsRepositoryMock = {
      incrementBalance: jest.fn().mockImplementation(() => ({
        ...baseWallet,
        balance: new Decimal('150.00'),
      })),
      decrementBalance: jest.fn().mockImplementation(() => ({
        ...baseWallet,
        balance: new Decimal('75.00'),
      })),
    };

    transactionsRepositoryMock = {
      create: jest
        .fn()
        .mockImplementation((payload: CreateTransactionPayload) => ({
          id: 'txn-1',
          walletId: baseWallet.id,
          type: payload.type,
          status: payload.status,
          amount: payload.amount,
          currency: payload.currency,
          externalReference: payload.externalReference ?? null,
          processor: payload.processor ?? null,
          processorPayload: payload.processorPayload ?? null,
          idempotencyKey: payload.idempotencyKey ?? null,
          metadata: payload.metadata ?? null,
          occurredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      listByWallet: jest.fn().mockResolvedValue([]),
    };

    paymentProviderMock = {
      createDeposit: jest.fn().mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
        amount: new Decimal('50.00'),
        currency: 'USD',
        processor: 'stripe-mock',
        raw: { mock: true },
      }),
      createWithdrawal: jest.fn().mockResolvedValue({
        id: 'po_123',
        status: 'succeeded',
        amount: new Decimal('25.00'),
        currency: 'USD',
        processor: 'stripe-mock',
        raw: { mock: true },
      }),
    } as unknown as PaymentProvider & {
      createDeposit: jest.Mock;
      createWithdrawal: jest.Mock;
    };

    const module = await Test.createTestingModule({
      providers: [
        FundsService,
        { provide: WalletsService, useValue: walletsServiceMock },
        { provide: WalletsRepository, useValue: walletsRepositoryMock },
        {
          provide: TransactionsRepository,
          useValue: transactionsRepositoryMock,
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: UsersService,
          useValue: { getByIdOrFail: jest.fn().mockResolvedValue({ ...user }) },
        },
        { provide: PAYMENT_PROVIDER, useValue: paymentProviderMock },
      ],
    }).compile();

    service = module.get(FundsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('credits the wallet when a deposit succeeds', async () => {
    const result = await service.depositFunds({
      userId: 'user-1',
      amount: '50.00',
    });

    expect(result.status).toBe(TransactionStatus.SUCCEEDED);
    expect(result.transaction.type).toBe(TransactionType.DEPOSIT);
    expect(result.transaction.amount.toString()).toBe('50');
    expect(result.wallet.balance.toString()).toBe('150');
    expect(walletsRepositoryMock.incrementBalance).toHaveBeenCalled();
    expect(paymentProviderMock.createDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: new Decimal('50.00'),
      }),
    );
  });

  it('throws when withdrawing more than the balance', async () => {
    walletsServiceMock.getOrCreateForUser.mockResolvedValueOnce({
      ...baseWallet,
      balance: new Decimal('10.00'),
    });

    await expect(
      service.withdrawFunds({ userId: 'user-1', amount: '20.00' }),
    ).rejects.toBeInstanceOf(InsufficientFundsException);
  });
});
