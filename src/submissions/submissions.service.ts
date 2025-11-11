import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
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
}
