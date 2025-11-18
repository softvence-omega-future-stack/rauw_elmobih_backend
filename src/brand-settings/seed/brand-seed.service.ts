import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class BrandSeedService implements OnModuleInit {
  private readonly logger = new Logger(BrandSeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultBrand();
  }

  async seedDefaultBrand() {
    try {
      const exists = await this.prisma.brandSettings.findFirst();
      if (exists) {
        this.logger.log('Brand settings exist — skipping seed.');
        return;
      }

      await this.prisma.brandSettings.create({
        data: {
          name: 'Default Branding',
          primaryColor: '#155BF6',
          theme: 'light',
          logo: null,
        },
      });

      this.logger.log('Default brand settings created.');
    } catch (error) {
      this.logger.error('Failed to seed brand settings', error);
    }
  }
}
