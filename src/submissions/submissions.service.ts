import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UserWithSubmissions } from 'src/common/interface/submission-result';
import {
  optionLabels,
  questionLabels,
} from 'src/common/question/question-mapper';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

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
      const userIds = usersWithCounts.map(user => user.id);
      
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
      const submissionsByUser = userSubmissions.reduce((acc, submission) => {
        if (!acc[submission.userId]) {
          acc[submission.userId] = [];
        }
        acc[submission.userId].push(submission);
        return acc;
      }, {} as Record<string, any[]>);

      // Build the final response structure
      const usersWithSubmissions: UserWithSubmissions[] = usersWithCounts.map(user => {
        const userSubs = submissionsByUser[user.id] || [];
        
        return {
          userId: user.id,
          deviceId: user.deviceId,
          language: user.language,
          ageGroup: user.ageGroup,
          lastSeenAt: user.lastSeenAt,
          createdAt: user.createdAt,
          totalSubmissions: user._count.submissions,
          submissions: userSubs.map(submission => ({
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
      });

      return { 
        users: usersWithSubmissions, 
        total: totalUsers,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
          hasMore: page < Math.ceil(totalUsers / limit),
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch submissions by user: ${error.message}`);
    }
  }

  async getSubmissionsByUserId(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deviceId: true,
          language: true,
          ageGroup: true, // This can be null
          lastSeenAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const [submissions, totalSubmissions] = await Promise.all([
        this.prisma.submission.findMany({
          where: { userId },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.submission.count({
          where: { userId },
        }),
      ]);

      // Map responses to include question labels
      const submissionsWithLabels = submissions.map((submission) => ({
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
        userAgent: submission.userAgent || undefined,
        submittedAt: submission.submittedAt,
        createdAt: submission.createdAt,
      }));

      return {
        user: {
          id: user.id,
          deviceId: user.deviceId,
          language: user.language,
          ageGroup: user.ageGroup, // This can be null
          lastSeenAt: user.lastSeenAt,
          createdAt: user.createdAt,
        },
        submissions: submissionsWithLabels,
        total: totalSubmissions,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalSubmissions / limit),
          hasMore: page < Math.ceil(totalSubmissions / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch user submissions: ${error.message}`);
    }
  }
}
