import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { BrandSeedService } from './brand-seed.service';

@Module({
  providers: [BrandSeedService, PrismaService],
  exports: [],
})
export class BrandSeedModule {}
