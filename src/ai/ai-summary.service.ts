import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    date?: string;
  }) {
    try {
      const savedSummary = await this.prisma.aISummary.create({
        data: {
          userId: data.userId,
          summary: data.summary,
          themes: data.themes,
          date: data.date,
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

  async updateSummary(
    data: {
      id: string,
      summary?: string;
      themes?: string[];
      date?: string;
    },
  ) {
    try {
      const updatedSummary = await this.prisma.aISummary.update({
        where: { id: data.id },
        data: {
          ...(data.summary && { summary: data.summary }),
          ...(data.themes && { themes: data.themes }),
          ...(data.date && { date: data.date }),
        },
      });

      return updatedSummary;
    } catch (error) {
      console.error(error);

      throw new HttpException(
        'Failed to update AI summary',
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
