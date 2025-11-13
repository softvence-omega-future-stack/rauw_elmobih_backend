import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { errorResponse, paginatedResponse, successResponse } from 'src/utils/response.util';


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

  @Get('by-users')
  async getSubmissionsGroupedByUser(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      
      const result = await this.submissionsService.getSubmissionsGroupedByUser(pageNum, limitNum);
      
      return successResponse(result, 'Submissions retrieved successfully grouped by users');
    } catch (error) {
      return errorResponse(error.message, 'Failed to fetch submissions by users');
    }
  }
@Get('user/:userId')
  async getSubmissionsByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      
      const result = await this.submissionsService.getSubmissionsByUserId(userId, pageNum, limitNum);
      
      return successResponse(result, 'User submissions retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, 'Failed to fetch user submissions');
    }
  }
  
}