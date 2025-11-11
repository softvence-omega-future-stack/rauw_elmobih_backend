import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RateLimitingService, PrismaService],
})
export class UsersModule {}