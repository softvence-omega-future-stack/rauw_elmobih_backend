import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface AdminData {
  email: string;
  password: string;
}

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  private readonly defaultAdmin: AdminData = {
    email: 'elmo@rauw.com',
    password: 'admin123',
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    try {
      // Check if admin already exists
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { email: this.defaultAdmin.email },
      });

      if (existingAdmin) {
        this.logger.log('ℹ️ Default admin already exists');
        return;
      }

      this.logger.log('👑 Creating default admin user...');

      // Hash password
      const hashedPassword = await bcrypt.hash(this.defaultAdmin.password, 12);

      // Create admin user
      const admin = await this.prisma.admin.create({
        data: {
          email: this.defaultAdmin.email,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      this.logger.log('Default admin created successfully!');
      this.logger.log(`Email: ${admin.email}`);
      this.logger.log(`Role: ${admin.role}`);
      this.logger.log(`ID: ${admin.id}`);
    } catch (error) {
      this.logger.error('❌ Error seeding default admin:', error);
    }
  }
}
