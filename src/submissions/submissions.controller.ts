import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { errorResponse, paginatedResponse } from 'src/utils/response.util';


@Controller('submissions')
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Get()
  async getAllSubmissions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      
      const { submissions, total } = await this.submissionsService.getAllSubmissions(pageNum, limitNum);
      
      return paginatedResponse(submissions, pageNum, limitNum, total);
    } catch (error) {
      return errorResponse(error.message, 'Failed to fetch submissions');
    }
  }
}