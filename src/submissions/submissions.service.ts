import { Injectable } from '@nestjs/common';
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

      if (!user) {
        return errorResponse('User not found', 'Invalid user ID');
      }

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
            const aiSummary = await this.aiSummaryService.getSummary(userId);

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

          // 🔥 Safe AI call
          try {
            const ai = await this.aiSummaryService.getSummary(sub.userId);

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
    dateRange?: string; // e.g., "last_30_days"
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

      // -----------------------------
      // DATE RANGE HANDLING
      // -----------------------------
      const dateFilter: any = {};

      if (dateRange) {
        const now = new Date();
        const ranges: Record<string, number> = {
          last_30_days: 30,
          last_15_days: 15,
          last_10_days: 10,
          last_7_days: 7,
          yesterday: 1,
          last_1_month: 30,
          last_2_month: 60,
          last_3_month: 90,
          last_6_month: 180,
          last_1_year: 365,
        };

        if (ranges[dateRange]) {
          const days = ranges[dateRange];
          const from = new Date();
          from.setDate(now.getDate() - days);
          dateFilter.gte = from;
        }
      }

      // -----------------------------
      // WHERE FILTERS
      // -----------------------------
      const where: any = {
        score: { gte: minScore, lte: maxScore },
      };

      if (Object.keys(dateFilter).length > 0) {
        where.submittedAt = dateFilter;
      }

      if (language && language !== 'ALL') {
        where.language = language;
      }

      if (ageGroup && ageGroup !== 'ALL') {
        where.ageGroup = ageGroup;
      }

      if (colorLevel && colorLevel !== 'ALL') {
        where.colorLevel = colorLevel;
      }

      // -----------------------------
      // FETCH FILTERED SUBMISSIONS
      // -----------------------------
      const submissions = await this.prisma.submission.findMany({
        where,
        select: {
          id: true,
          userId: true,
          score: true,
          colorLevel: true,
          submittedAt: true,
          ageGroup: true,
          language: true,
          responses: true,
        },
        orderBy: { submittedAt: 'desc' },
      });

      const total = submissions.length;

      // If no submissions → return empty stats
      if (total === 0) {
        return successResponse(
          {
            total: 0,
            avgScore: 0,
            lowWellBeingPercentage: 0,
            topThemes: [],
            themeCategories: [],
          },
          'Stats calculated successfully (empty dataset)',
        );
      }

      // -----------------------------
      // COMPUTE WHO-5 AVERAGE SCORE
      // -----------------------------
      const avgScore =
        submissions.reduce((sum, item) => sum + item.score, 0) / total;

      // -----------------------------
      // LOW WELL-BEING PERCENTAGE
      // WHO-5 scoring: < 50 = low well-being
      // -----------------------------
      const lowCount = submissions.filter((s) => s.score < 50).length;
      const lowWellBeingPercentage = Math.round((lowCount / total) * 100);

      // -----------------------------
      // AI SUMMARY THEMES (Dynamic)
      // -----------------------------
      const aiSummaries = await Promise.all(
        submissions.map(async (sub) => {
          try {
            const summary = await this.aiSummaryService.getSummary(sub.userId);
            return summary;
          } catch (error) {
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

      // Top 3 themes
      const topThemes = themeCategories
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // -----------------------------
      // FINAL RESPONSE
      // -----------------------------
      return successResponse(
        {
          total,
          avgScore: Math.round(avgScore),
          lowWellBeingPercentage,
          topThemes,
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





}
