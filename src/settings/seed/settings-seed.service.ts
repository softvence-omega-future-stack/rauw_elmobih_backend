import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { OrganizationType } from '@prisma/client';

@Injectable()
export class SettingsSeedService implements OnModuleInit {
  private readonly logger = new Logger(SettingsSeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedSettings();
  }

  async seedSettings() {
    try {
      const existing = await this.prisma.organizationSettings.findFirst();

      if (existing) {
        this.logger.log('Settings already exist — skipping seed.');
        return;
      }

      await this.prisma.organizationSettings.create({
        data: {
          organizationType: OrganizationType.COA,
          contactEmail: 'support@default.org',
          phoneNumber: '+000000000',
          name: 'RAUW',
          additionalNotes: 'Default additional notes',
        },
      });

      this.logger.log('Default settings created successfully ✔️');
    } catch (error) {
      this.logger.error('Error during settings seeding:', error);
    }
  }
}
