import { Injectable } from '@nestjs/common';
import { AgeGroup, ColorLevel, Language } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AiSummaryService } from 'src/ai/ai-summary.service';
import { UserWithSubmissions } from 'src/common/interface/submission-result';
import {
  optionLabels,
  questionLabels,
} from 'src/common/question/question-mapper';
import { errorResponse, successResponse } from 'src/utils/response.util';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private aiSummaryService: AiSummaryService,
  ) {}

  async getAllSubmissions(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        this.prisma.submission.findMany({
          select: {
            id: true,
            userId: true,
            ipHash: true,
            responses: true,
            score: true,
            colorLevel: true,
            language: true,
            ageGroup: true,
            userAgent: true,
            submittedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.submission.count(),
      ]);

      // Map responses to include question labels
      const submissionsWithLabels = submissions.map((submission) => ({
        ...submission,
        responses: Object.entries(
          submission.responses as Record<string, number>,
        ).map(([key, value]) => ({
          questionKey: key,
          question: questionLabels[key] || key,
          //   answer: value,
          answerText: optionLabels[value as number] || 'Unknown',
        })),
      }));

      return { submissions: submissionsWithLabels, total };
    } catch (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }
  }

  //! Skip for Now
  async getSubmissionsGroupedByUser(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      // First, get paginated users with their submission counts
      const [usersWithCounts, totalUsers] = await Promise.all([
        this.prisma.user.findMany({
          select: {
            id: true,
            deviceId: true,
            language: true,
            ageGroup: true,
            lastSeenAt: true,
            createdAt: true,
            _count: {
              select: {
                submissions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.user.count(),
      ]);

      // Get all submissions for these users
      const userIds = usersWithCounts.map((user) => user.id);

      const userSubmissions = await this.prisma.submission.findMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        include: {
          user: {
            select: {
              deviceId: true,
              language: true,
              ageGroup: true,
              lastSeenAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
      });

      // Group submissions by user
      const submissionsByUser = userSubmissions.reduce(
        (acc, submission) => {
          if (!acc[submission.userId]) {
            acc[submission.userId] = [];
          }
          acc[submission.userId].push(submission);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      // Build the final response structure
      const usersWithSubmissions: UserWithSubmissions[] = usersWithCounts.map(
        (user) => {
          const userSubs = submissionsByUser[user.id] || [];

          return {
            userId: user.id,
            deviceId: user.deviceId,
            language: user.language,
            ageGroup: user.ageGroup,
            lastSeenAt: user.lastSeenAt,
            createdAt: user.createdAt,
            totalSubmissions: user._count.submissions,
            submissions: userSubs.map((submission) => ({
              id: submission.id,
              ipHash: submission.ipHash,
              responses: Object.entries(
                submission.responses as Record<string, number>,
              ).map(([key, value]) => ({
                questionKey: key,
                question: questionLabels[key] || key,
                answerText: optionLabels[value as number] || 'Unknown',
              })),
              score: submission.score,
              colorLevel: submission.colorLevel,
              userAgent: submission.userAgent,
              submittedAt: submission.submittedAt,
              createdAt: submission.createdAt,
            })),
          };
        },
      );

      return {
        users: usersWithSubmissions,
        total: totalUsers,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
          hasMore: page < Math.ceil(totalUsers / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch submissions by user: ${error.message}`);
    }
  }

  // Ai summary integrated
  async getSubmissionsByUserId(
    
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    console.log("-------------------------hitone submitions--------------------------------------------");
    try {
      const skip = (page - 1) * limit;

      // Validate user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deviceId: true,
          language: true,
          ageGroup: true,
          lastSeenAt: true,
          createdAt: true,
        },
      });
      console.log("-------------------------hittwo submitions--------------------------------------------");
      if (!user) {
        return errorResponse('User not found', 'Invalid user ID');
      }
     console.log("-------------------------hitthree submitions--------------------------------------------");
      const [submissions, totalSubmissions] = await Promise.all([
        this.prisma.submission.findMany({
          where: { userId },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.submission.count({ where: { userId } }),
      ]);

      // Process each submission and attach AI summary
      const submissionsWithLabels = await Promise.all(
        submissions.map(async (submission) => {
          const formatted = {
            id: submission.id,
            ipHash: submission.ipHash,
            responses: Object.entries(
              submission.responses as Record<string, number>,
            ).map(([key, value]) => ({
              questionKey: key,
              question: questionLabels[key] || key,
              answerText: optionLabels[value as number] || 'Unknown',
            })),
            score: submission.score,
            colorLevel: submission.colorLevel,
            userAgent: submission.userAgent,
            submittedAt: submission.submittedAt,
            createdAt: submission.createdAt,
          };

          try {
            console.log("-------------------------hitfour submitions--------------------------------------------");
            const aiSummary = await this.aiSummaryService.getSummary(userId);

            console.log("-------------------------hitfiver submitions--------------------------------------------");

            return {
              ...formatted,
              aiSummary,
              aiError: null,
            };
          } catch (error) {
            return {
              ...formatted,
              aiSummary: null,
              aiError: 'AI summary unavailable',
            };
          }
        }),
      );

      // Final structured response
      return successResponse(
        {
          user,
          submissions: submissionsWithLabels,
          total: totalSubmissions,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalSubmissions / limit),
            hasMore: page < Math.ceil(totalSubmissions / limit),
          },
        },
        'User submissions retrieved successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch user submissions',
      );
    }
  }

  // Ai summary integrated
  async getAllSubmissionsWithAi(page: number = 1, limit: number = 10) {
    console.log('-------------------------hitone--------------------------------------------');
    try {
       console.log('-------------------------hittwo--------------------------------------------');
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        this.prisma.submission.findMany({
          select: {
            id: true,
            userId: true,
            ipHash: true,
            responses: true,
            score: true,
            colorLevel: true,
            language: true,
            ageGroup: true,
            userAgent: true,
            submittedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.submission.count(),
      ]);
       console.log('-------------------------hitthree--------------------------------------------');
      // Process each submission with AI summary
      const submissionsWithAi = await Promise.all(
        submissions.map(async (sub) => {
          // Map question labels
          const formatted = {
            ...sub,
            responses: Object.entries(
              sub.responses as Record<string, number>,
            ).map(([key, value]) => ({
              questionKey: key,
              question: questionLabels[key] || key,
              answerText: optionLabels[value as number] || 'Unknown',
            })),
          };
      console.log('-------------------------hitfour--------------------------------------------');
          // Safe AI call
          try {
             console.log('-------------------------hitetry--------------------------------------------');
            const ai = await this.aiSummaryService.getSummary(sub.userId);
            console.log('-------------------------hitfive--------------------------------------------');
            console.log('AI summary fetched for submission', sub.id, ai);
            console.log('-------------------------hitfiveend--------------------------------------------');

            return {
              ...formatted,
              aiSummary: ai,
              aiError: null,
            };
          } catch (e) {
            return {
              ...formatted,
              aiSummary: null,
              aiError: 'AI summary unavailable',
            };
          }
        }),
      );

      return successResponse(
        {
          submissions: submissionsWithAi,
          total,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page < Math.ceil(total / limit),
          },
        },
        'All submissions with AI summary retrieved',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch submissions with AI',
      );
    }
  }

  async getSubmissionStats(filters: {
    dateRange?: string;
    language?: string;
    ageGroup?: string;
    colorLevel?: string;
    minScore?: number;
    maxScore?: number;
  }) {
    try {
      const {
        dateRange,
        language,
        ageGroup,
        colorLevel,
        minScore = 0,
        maxScore = 100,
      } = filters;

      const now = new Date();

      // DATE RANGE MAP

      const ranges: Record<string, number> = {
        last_30_days: 30,
        last_15_days: 15,
        last_10_days: 10,
        last_7_days: 7,
        yesterday: 1,
        last_2_month: 60,
        last_3_month: 90,
        last_6_month: 180,
        last_1_year: 365,
      };

      const where: any = {
        score: { gte: minScore, lte: maxScore },
      };

      // CURRENT RANGE FILTER

      if (dateRange && ranges[dateRange]) {
        const days = ranges[dateRange];

        const from = new Date();
        from.setDate(now.getDate() - days);

        where.submittedAt = { gte: from };
      }

      if (language && language !== 'ALL') where.language = language;
      if (ageGroup && ageGroup !== 'ALL') where.ageGroup = ageGroup;
      if (colorLevel && colorLevel !== 'ALL') where.colorLevel = colorLevel;

      // FETCH CURRENT SUBMISSIONS

      const submissions = await this.prisma.submission.findMany({
        where,
        select: {
          id: true,
          userId: true,
          score: true,
          submittedAt: true,
          responses: true,
        },
        orderBy: { submittedAt: 'desc' },
      });

      const total = submissions.length;

      if (total === 0) {
        return successResponse(
          {
            total: 0,
            totalChangePercent: 0,
            anonymousCheckins: 0,
            anonymousCheckinsPercent: 0,

            avgScore: 0,
            avgScoreChange: 0,

            lowWellBeingPercentage: 0,
            lowWellBeingChange: 0,

            topThemes: [],
            topThemesCount: 0,
            otherThemesCount: 0,
            themeCategories: [],
          },
          'Stats calculated successfully (empty dataset)',
        );
      }

      const avgScore = submissions.reduce((sum, s) => sum + s.score, 0) / total;

      const lowCount = submissions.filter((s) => s.score < 50).length;
      const lowWellBeingPercentage = Math.round((lowCount / total) * 100);

      const aiSummaries = await Promise.all(
        submissions.map(async (sub) => {
          try {
            return await this.aiSummaryService.getSummary(sub.userId);
          } catch {
            return null;
          }
        }),
      );

      const themeCounts: Record<string, number> = {};

      aiSummaries
        .filter((x) => x && x.themes)
        .forEach((summary) => {
          summary.themes.forEach((t: string) => {
            themeCounts[t] = (themeCounts[t] || 0) + 1;
          });
        });

      const themeCategories = Object.entries(themeCounts).map(
        ([theme, count]) => ({
          theme,
          count,
        }),
      );

      const topThemes = themeCategories
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // PREVIOUS DATE RANGE

      let previousWhere = { ...where };

      if (dateRange && ranges[dateRange]) {
        const days = ranges[dateRange];

        const prevFrom = new Date();
        prevFrom.setDate(now.getDate() - days * 2);

        const prevTo = new Date();
        prevTo.setDate(now.getDate() - days);

        previousWhere.submittedAt = {
          gte: prevFrom,
          lte: prevTo,
        };
      }

      const previousSubs = await this.prisma.submission.findMany({
        where: previousWhere,
        select: { score: true },
      });

      // PREVIOUS METRICS

      const prevTotal = previousSubs.length;

      const prevAvg =
        prevTotal > 0
          ? previousSubs.reduce((a, b) => a + b.score, 0) / prevTotal
          : 0;

      const prevLowCount = previousSubs.filter((s) => s.score < 50).length;

      const prevLowPercent =
        prevTotal > 0 ? Math.round((prevLowCount / prevTotal) * 100) : 0;

      const totalChangePercent =
        prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;

      const avgScoreChange = Math.round(avgScore - prevAvg);

      const lowWellBeingChange = lowWellBeingPercentage - prevLowPercent;

      return successResponse(
        {
          total,
          totalChangePercent,

          anonymousCheckins: total, // all submissions considered anonymous
          anonymousCheckinsPercent: totalChangePercent,

          avgScore: Math.round(avgScore),
          avgScoreChange,

          lowWellBeingPercentage,
          lowWellBeingChange,

          topThemes,
          topThemesCount: topThemes.length,
          otherThemesCount: themeCategories.length - topThemes.length,

          themeCategories,
        },
        'Submission statistics retrieved successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to calculate stats',
        'Error fetching submission stats',
      );
    }
  }

  // chart
  async getScoreDistributionByLanguage() {
    try {
      // 1️⃣ Fetch real submissions grouped by language
      const result = await this.prisma.submission.groupBy({
        by: ['language'],
        _avg: { score: true },
        _count: { id: true },
      });

      // 2️⃣ Convert Prisma result to a map for easy lookup
      const resultMap = new Map(
        result.map((r) => [
          r.language,
          {
            language: r.language,
            averageScore: Math.round(r._avg.score || 0),
            submissions: r._count.id,
          },
        ]),
      );

      // 3️⃣ Build final response INCLUDING ALL ENUMS
      const allLanguagesResponse = Object.values(Language).map((lang) => {
        if (resultMap.has(lang)) return resultMap.get(lang);

        // No submissions → default 0 values
        return {
          language: lang,
          averageScore: 0,
          submissions: 0,
        };
      });

      return successResponse(
        {
          totalLanguages: allLanguagesResponse.length,
          languages: allLanguagesResponse,
        },
        'Score distribution by language retrieved successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to calculate language distribution',
      );
    }
  }

  async getColorScoreDistribution() {
    try {
      // 1️⃣ Fetch submissions grouped by colorLevel
      const grouped = await this.prisma.submission.groupBy({
        by: ['colorLevel'],
        _count: { id: true },
      });

      // 2️⃣ Convert to map for quick lookup
      const map = new Map(
        grouped.map((g) => [g.colorLevel, { submissions: g._count.id }]),
      );

      // 3️⃣ Count total submissions (for percentages)
      const totalSubmissions = grouped.reduce((sum, g) => sum + g._count.id, 0);

      const COLOR_LEVEL_CONFIG = {
        RED: { name: 'Low', color: '#FF4842' },
        ORANGE: { name: 'Moderate', color: '#FFC107' },
        GREEN: { name: 'High', color: '#48BB78' },
      };

      // 4️⃣ Build final response ALWAYS including ALL ColorLevel enums
      const response = Object.values(ColorLevel).map((level) => {
        const meta = COLOR_LEVEL_CONFIG[level];
        const count = map.get(level)?.submissions || 0;

        const percentage =
          totalSubmissions === 0
            ? 0
            : Math.round((count / totalSubmissions) * 100);

        return {
          name: meta.name,
          value: percentage,
          submissions: count,
          color: meta.color,
        };
      });

      return {
        success: true,
        message: 'Color-coded score distribution retrieved successfully',
        data: response,
      };
    } catch (error) {
      console.error('Color score distribution error', error);
      return {
        success: false,
        message: 'Failed to calculate score distribution',
        error: error.message,
      };
    }
  }

  async getAverageScoreByAgeGroup() {
    try {
      // ✅ Get all age groups from Prisma enum
      const allAgeGroups = Object.values(AgeGroup);

      // Get all submissions including those with null ageGroup
      const grouped = await this.prisma.submission.groupBy({
        by: ['ageGroup'],
        _avg: { score: true },
        _count: { score: true },
      });

      // Create a map for quick lookup
      const groupedMap = new Map(
        grouped.map((g) => [
          g.ageGroup,
          {
            averageScore: g._avg.score || 0,
            submissions: g._count.score,
          },
        ]),
      );

      const result = allAgeGroups.map((age) => {
        const found = groupedMap.get(age);

        return {
          ageGroup: age,
          averageScore: found ? Math.round(found.averageScore) : 0,
          submissions: found ? found.submissions : 0,
        };
      });

      return successResponse(
        {
          totalAgeGroups: result.length,
          ageGroups: result,
        },
        'Average WHO-5 score by age group retrieved successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to calculate average score by age group',
        'Error computing WHO-5 score statistics',
      );
    }
  }

  // Add this method to your SubmissionsService class
  async getWeeklyScoreTrend(weeks: number = 8) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - weeks * 7); // Go back 8 weeks

      // Get submissions from the past 8 weeks
      const submissions = await this.prisma.submission.findMany({
        where: {
          submittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          score: true,
          submittedAt: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
      });

      if (submissions.length === 0) {
        return successResponse(
          {
            weeks: [],
            summary: {
              totalSubmissions: 0,
              overallAverage: 0,
              trend: 'no_data',
            },
          },
          'Weekly score trend retrieved successfully (no data)',
        );
      }

      // Group submissions by week
      const weeklyData: Record<string, { scores: number[]; total: number }> =
        {};

      submissions.forEach((submission) => {
        const weekKey = this.getWeekKey(submission.submittedAt);

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { scores: [], total: 0 };
        }

        weeklyData[weekKey].scores.push(submission.score);
        weeklyData[weekKey].total += submission.score;
      });

      // Generate all week labels for the past 8 weeks
      const weekLabels = this.generateWeekLabels(weeks);

      // Build response with all weeks, including those with no data
      const weeklyTrend = weekLabels.map((week) => {
        const weekData = weeklyData[week.key];
        const averageScore =
          weekData && weekData.scores.length > 0
            ? Math.round(weekData.total / weekData.scores.length)
            : 0;

        return {
          week: week.label,
          weekKey: week.key,
          averageScore,
          submissions: weekData ? weekData.scores.length : 0,
          startDate: week.startDate,
          endDate: week.endDate,
        };
      });

      // Calculate overall average and trend
      const allScores = submissions.map((s) => s.score);
      const overallAverage = Math.round(
        allScores.reduce((a, b) => a + b, 0) / allScores.length,
      );

      // Determine trend (comparing first and last week with data)
      const weeksWithData = weeklyTrend.filter((w) => w.submissions > 0);
      let trend: 'increasing' | 'decreasing' | 'stable' | 'no_data' = 'no_data';

      if (weeksWithData.length >= 2) {
        const firstWeek = weeksWithData[0];
        const lastWeek = weeksWithData[weeksWithData.length - 1];

        if (lastWeek.averageScore > firstWeek.averageScore + 2) {
          trend = 'increasing';
        } else if (lastWeek.averageScore < firstWeek.averageScore - 2) {
          trend = 'decreasing';
        } else {
          trend = 'stable';
        }
      }

      return successResponse(
        {
          weeks: weeklyTrend,
          summary: {
            totalSubmissions: submissions.length,
            overallAverage,
            trend,
            period: `${weeks} weeks`,
            dateRange: {
              start: startDate,
              end: endDate,
            },
          },
        },
        'Weekly well-being score trend retrieved successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Failed to calculate weekly score trend',
        'Error computing weekly well-being trend',
      );
    }
  }

  private generateWeekLabels(weeks: number): Array<{
    key: string;
    label: string;
    startDate: Date;
    endDate: Date;
  }> {
    const result: Array<{
      key: string;
      label: string;
      startDate: Date;
      endDate: Date;
    }> = [];

    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      // Calculate end of week (Sunday)
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);
      endDate.setHours(23, 59, 59, 999);

      // Calculate start of week (Monday)
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const weekKey = this.getWeekKey(endDate);
      const weekNumber = weekKey.split('-W')[1];
      const label = `Week ${weekNumber}`;

      result.push({
        key: weekKey,
        label,
        startDate,
        endDate,
      });
    }

    return result;
  }

  private getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // ISO week calculation
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );

    return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
