import { Module } from '@nestjs/common';
import { StripePaymentService } from './stripe-payment.service';
import { PAYMENT_PROVIDER } from './payment.tokens';

@Module({
  providers: [
    StripePaymentService,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: StripePaymentService,
    },
  ],
  exports: [PAYMENT_PROVIDER, StripePaymentService],
})
export class PaymentsModule {}
