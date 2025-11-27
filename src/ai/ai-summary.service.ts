import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AiSummaryService {
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.config.get<string>('AI_SUMMARY_API');

    if (!url) {
      throw new Error('AI_SUMMARY_API is missing in .env');
    }

    this.baseUrl = url;
  }

  async getAndStoreSummary(userId: string) {
    try {
      const response = await axios.post(this.baseUrl, {
        user_id: userId,
      });

      const { summary, themes } = response.data;

      const savedSummary = await this.prisma.aISummary.create({
        data: {
          userId,
          summary,
          themes,
        },
      });

      return savedSummary;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        `Failed to fetch or save AI summary: ${error.message}`,
        500,
      );
    }
  }

  // Get all summaries
  async getAllSummaries() {
    return this.prisma.aISummary.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
      },
    });
  }
}
