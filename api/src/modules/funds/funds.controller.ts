import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { FundsService } from './funds.service';
import { FundsOperationDto } from './dto/funds-operation.dto';
import { toTransactionResponse, toWalletResponse } from './funds.presenter';

@Controller('users/:userId/wallet')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  async getWallet(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const wallet = await this.fundsService.getWallet(userId);
    return toWalletResponse(wallet);
  }

  @Get('transactions')
  async listTransactions(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const { wallet, transactions } =
      await this.fundsService.listTransactions(userId);
    return {
      wallet: toWalletResponse(wallet),
      transactions: transactions.map(toTransactionResponse),
    };
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  async deposit(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() payload: FundsOperationDto,
  ) {
    const result = await this.fundsService.depositFunds({
      userId,
      amount: payload.amount,
      currency: payload.currency,
      metadata: payload.metadata,
      idempotencyKey: payload.idempotencyKey,
    });

    return {
      wallet: toWalletResponse(result.wallet),
      transaction: toTransactionResponse(result.transaction),
    };
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() payload: FundsOperationDto,
  ) {
    const result = await this.fundsService.withdrawFunds({
      userId,
      amount: payload.amount,
      currency: payload.currency,
      metadata: payload.metadata,
      idempotencyKey: payload.idempotencyKey,
    });

    return {
      wallet: toWalletResponse(result.wallet),
      transaction: toTransactionResponse(result.transaction),
    };
  }
}
