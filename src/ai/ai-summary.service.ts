import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AiSummaryService {
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async saveSummary(data: {
    userId: string;
    summary: string;
    themes: string[];
  }) {
    try {
      // Optional: block duplicate summaries for same user
      const existing = await this.prisma.aISummary.findFirst({
        where: { userId: data.userId },
      });

      if (existing) {
        return existing;
      }

      const savedSummary = await this.prisma.aISummary.create({
        data: {
          userId: data.userId,
          summary: data.summary,
          themes: data.themes,
        },
      });

      return savedSummary;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Failed to save AI summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
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
