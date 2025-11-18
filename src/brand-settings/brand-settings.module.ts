import { Module } from '@nestjs/common';
import { BrandSettingsService } from './brand-settings.service';
import { BrandSettingsController } from './brand-settings.controller';
import { PrismaService } from 'prisma/prisma.service';
import { BrandSeedModule } from './seed/brand-seed.module';

@Module({
  imports: [BrandSeedModule],
  controllers: [BrandSettingsController],
  providers: [BrandSettingsService, PrismaService],
  exports: [BrandSettingsService],
})
export class BrandSettingsModule {}
