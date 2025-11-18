import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from 'prisma/prisma.service';
import { AiSummaryModule } from 'src/ai/ai-summary.module';

@Module({
  imports: [AiSummaryModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PrismaService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
