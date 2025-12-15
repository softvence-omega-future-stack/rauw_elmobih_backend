import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { ThemeMonitorService } from '../jobs/theme-monitor.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ThemeMonitorService, PrismaService],
})
export class JobsModule {}
