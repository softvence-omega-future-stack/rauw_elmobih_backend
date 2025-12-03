import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from 'src/utils/response.util';
import { SubmissionStatsQueryDto } from './dto/submission-stats-filter.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Get()
  async getAllSubmissions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const { submissions, total } =
        await this.submissionsService.getAllSubmissions(pageNum, limitNum);

      return paginatedResponse(submissions, pageNum, limitNum, total);
    } catch (error) {
      return errorResponse(error.message, 'Failed to fetch submissions');
    }
  }

  @Get('today/:userId')
async getToday(@Param('userId') userId: string) {
  return {
    success: true,
    data: await this.submissionsService.getTodaySubmission(userId)
  }
}

  @Get('all-with-ai')
  getAllWithAi(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() query: SubmissionStatsQueryDto,
  ) {
    
    return this.submissionsService.getAllSubmissionsWithAi(+page, +limit, query);
  }

  @Get('by-users')
  async getSubmissionsGroupedByUser(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const result = await this.submissionsService.getSubmissionsGroupedByUser(
        pageNum,
        limitNum,
      );

      return successResponse(
        result,
        'Submissions retrieved successfully grouped by users',
      );
    } catch (error) {
      return errorResponse(
        error.message,
        'Failed to fetch submissions by users',
      );
    }
  }
  @Get('user/:userId')
  async getSubmissionsByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const result = await this.submissionsService.getSubmissionsByUserId(
        userId,
        pageNum,
        limitNum,
      );

      return successResponse(result, 'User submissions retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, 'Failed to fetch user submissions');
    }
  }

  @Get('stats')
  async getStats(@Query() query: SubmissionStatsQueryDto) {
    return this.submissionsService.getSubmissionStats(query);
  }

  // chart
  @Get('chart/score-by-language')
  async getScoreDistributionByLanguage(@Query() query: SubmissionStatsQueryDto) {
    try {
      return await this.submissionsService.getScoreDistributionByLanguage(query);
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch score distribution by language',
      );
    }
  }

  @Get('chart/color-by-score')
  async getColorDistribution(@Query() query: SubmissionStatsQueryDto) {
    return await this.submissionsService.getColorScoreDistribution(query);
  }

  @Get('chart/average-score-by-age')
  async averageScoreByAge(@Query() query: SubmissionStatsQueryDto) {
    try {
      return await this.submissionsService.getAverageScoreByAgeGroup(query);
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to fetch data',
        'Error retrieving average WHO-5 score by age group',
      );
    }
  }

  // Add this to your SubmissionsController class
  @Get('chart/weekly-trend')
  async getWeeklyScoreTrend(
    @Query() query: SubmissionStatsQueryDto,
  ) {
    try {
      return await this.submissionsService.getWeeklyScoreTrend(8, query);
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to fetch weekly trend',
        'Error retrieving weekly well-being score trend',
      );
    }
  }
}
