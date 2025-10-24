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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { toUserResponse } from './users.presenter';
import { WalletsService } from '../wallets/wallets.service';
import { toWalletResponse } from '../funds/funds.presenter';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() payload: CreateUserDto) {
    const user = await this.usersService.create(payload);
    const wallet = await this.walletsService.getOrCreateForUser(user.id);

    return {
      user: toUserResponse(user),
      wallet: toWalletResponse(wallet),
    };
  }

  @Get(':id')
  async getUser(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.usersService.getByIdOrFail(id);
    return toUserResponse(user);
  }
}
