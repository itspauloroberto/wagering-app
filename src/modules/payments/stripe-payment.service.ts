import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { AppConfig } from '../../config/configuration';
import {
  PaymentChargeRequest,
  PaymentChargeResponse,
  PaymentProvider,
  PaymentPayoutRequest,
  PaymentPayoutResponse,
} from './payment-provider.interface';

@Injectable()
export class StripePaymentService implements PaymentProvider {
  private readonly logger = new Logger(StripePaymentService.name);
  private readonly stripe?: Stripe;
  private readonly mockMode: boolean;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const secretKey = configService.get<string>('stripe.secretKey', {
      infer: true,
    });
    this.mockMode = !secretKey || secretKey.includes('placeholder');

    if (!this.mockMode && secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn(
        'Stripe secret key not configured. Running in mock payment mode.',
      );
    }
  }

  async createDeposit(
    request: PaymentChargeRequest,
  ): Promise<PaymentChargeResponse> {
    if (!this.stripe || this.mockMode) {
      return this.createMockChargeResponse(request, 'deposit');
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: this.toStripeAmount(request.amount),
      currency: request.currency.toLowerCase(),
      confirm: true,
      metadata: {
        userId: request.userId,
        walletId: request.walletId,
        ...request.metadata,
      },
    });

    return {
      id: intent.id,
      status: this.mapIntentStatus(intent.status),
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      processor: 'stripe',
      raw: intent as unknown as Record<string, unknown>,
    };
  }

  async createWithdrawal(
    request: PaymentPayoutRequest,
  ): Promise<PaymentPayoutResponse> {
    if (!this.stripe || this.mockMode) {
      return this.createMockPayoutResponse(request, 'withdrawal');
    }

    const payout = await this.stripe.payouts.create({
      amount: this.toStripeAmount(request.amount),
      currency: request.currency.toLowerCase(),
      metadata: {
        userId: request.userId,
        walletId: request.walletId,
        ...request.metadata,
      },
    });

    return {
      id: payout.id,
      status: this.mapPayoutStatus(payout.status),
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      processor: 'stripe',
      raw: payout as unknown as Record<string, unknown>,
    };
  }

  private mapIntentStatus(
    status: Stripe.PaymentIntent.Status,
  ): PaymentChargeResponse['status'] {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'processing':
      case 'requires_action':
      case 'requires_payment_method':
      case 'requires_confirmation':
        return 'pending';
      default:
        return 'failed';
    }
  }

  private mapPayoutStatus(
    status: Stripe.Payout['status'],
  ): PaymentPayoutResponse['status'] {
    switch (status) {
      case 'paid':
        return 'succeeded';
      case 'pending':
      case 'in_transit':
        return 'pending';
      default:
        return 'failed';
    }
  }

  private toStripeAmount(amount: Prisma.Decimal): number {
    return Number(amount.mul(100).toNumber());
  }

  private createMockChargeResponse(
    request: PaymentChargeRequest,
    prefix: string,
  ): PaymentChargeResponse {
    return {
      id: `${prefix}_${randomUUID()}`,
      status: 'succeeded',
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      processor: 'stripe-mock',
      raw: {
        mock: true,
        requestMetadata: request.metadata,
      },
    };
  }

  private createMockPayoutResponse(
    request: PaymentPayoutRequest,
    prefix: string,
  ): PaymentPayoutResponse {
    return {
      id: `${prefix}_${randomUUID()}`,
      status: 'succeeded',
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      processor: 'stripe-mock',
      raw: {
        mock: true,
        destination: request.destination ?? null,
        requestMetadata: request.metadata,
      },
    };
  }
}
