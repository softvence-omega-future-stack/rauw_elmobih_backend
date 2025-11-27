import { Controller, Get, Param } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';

@Controller('submissions')
export class AiSummaryController {
  constructor(private readonly aiSummaryService: AiSummaryService) {}

  @Get('get-summary/:userId')
  async getSummary(@Param('userId') userId: string) {
    return await this.aiSummaryService.getAndStoreSummary(userId);
  }

  @Get('get-all-summaries')
  async getAll() {
    return this.aiSummaryService.getAllSummaries();
  }
}
