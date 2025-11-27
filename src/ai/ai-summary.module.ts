import { Module } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { AiSummaryController } from './ai-summary.controller';

@Module({
  imports: [ConfigModule],
  providers: [AiSummaryService, PrismaService],
  controllers: [AiSummaryController],
  exports: [AiSummaryService], 
})
export class AiSummaryModule {}
