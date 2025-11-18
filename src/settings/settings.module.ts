import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaService } from 'prisma/prisma.service';
import { SettingsSeedModule } from './seed/settings-seed.module';

@Module({
  imports: [SettingsSeedModule],
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService],
})
export class SettingsModule {}
