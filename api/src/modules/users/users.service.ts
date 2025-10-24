import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';

export interface CreateUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async getByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }
    return user;
  }

  async create(payload: CreateUserPayload): Promise<User> {
    return this.usersRepository.create({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
  }

  async getOrCreate(payload: CreateUserPayload): Promise<User> {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing) {
      return existing;
    }
    return this.create(payload);
  }
}
