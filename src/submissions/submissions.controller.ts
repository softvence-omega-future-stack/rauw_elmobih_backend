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

  @Get('all-with-ai')
  getAllWithAi(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.submissionsService.getAllSubmissionsWithAi(+page, +limit);
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
    return this.submissionsService.getSubmissionStats({
      dateRange: query.dateRange,
      language: query.language,
      ageGroup: query.ageGroup,
      colorLevel: query.colorLevel,
      minScore: query.minScore ? Number(query.minScore) : undefined,
      maxScore: query.maxScore ? Number(query.maxScore) : undefined,
    });
  }

  // chart
  @Get('chart/score-by-language')
  async getScoreDistributionByLanguage() {
    try {
      return await this.submissionsService.getScoreDistributionByLanguage();
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch score distribution by language',
      );
    }
  }

  @Get('chart/color-by-score')
  async getColorDistribution() {
    return await this.submissionsService.getColorScoreDistribution();
  }

  @Get('chart/average-score-by-age')
  async averageScoreByAge() {
    try {
      return await this.submissionsService.getAverageScoreByAgeGroup();
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to fetch data',
        'Error retrieving average WHO-5 score by age group',
      );
    }
  }

  // Add this to your SubmissionsController class
  @Get('chart/weekly-trend')
  async getWeeklyScoreTrend(@Query('weeks') weeks: string = '8') {
    try {
      const weeksNum = parseInt(weeks) || 8;

      // Validate weeks parameter
      if (weeksNum < 1 || weeksNum > 52) {
        return errorResponse(
          'Weeks parameter must be between 1 and 52',
          'Invalid weeks parameter',
        );
      }

      return await this.submissionsService.getWeeklyScoreTrend(weeksNum);
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to fetch weekly trend',
        'Error retrieving weekly well-being score trend',
      );
    }
  }
}
