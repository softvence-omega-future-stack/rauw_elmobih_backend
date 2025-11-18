import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SettingsSeedService } from './settings-seed.service';

@Module({
  providers: [SettingsSeedService, PrismaService],
  exports: [SettingsSeedService],
})
export class SettingsSeedModule {}
