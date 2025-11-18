import { Module } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [AiSummaryService],
  exports: [AiSummaryService], 
})
export class AiSummaryModule {}
