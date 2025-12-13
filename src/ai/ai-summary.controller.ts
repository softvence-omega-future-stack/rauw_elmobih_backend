import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';

@Controller('submissions')
export class AiSummaryController {
  constructor(private readonly aiSummaryService: AiSummaryService) {}

  @Post('save-summary')
  async saveSummary(
    @Body() body: { userId: string; summary: string; themes: string[] },
  ) {
    return await this.aiSummaryService.saveSummary(body);
  }

  @Patch('update-summary')
  async updateSummary(
    @Body()
    body: {
      id: string,
      summary?: string;
      themes?: string[];
      date?: string;
    },
  ) {
    return await this.aiSummaryService.updateSummary(body);
  }

  @Get('get-all-summaries')
  async getAll() {
    return this.aiSummaryService.getAllSummaries();
  }
}
