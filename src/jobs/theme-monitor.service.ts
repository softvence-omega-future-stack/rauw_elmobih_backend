
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { ColorLevel } from '@prisma/client';

@Injectable()
export class ThemeMonitorService {
  private readonly logger = new Logger(ThemeMonitorService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleThemeCheck() {
    this.logger.debug('Checking for "Onveiligheidsgevoel" themes in recent summaries...');

    try {
        // 1. Find all users who have an AI Summary with "Onveiligheidsgevoel" in the last 24 hours (optimization)
        // Or getting all summaries might be heavy. Let's look for "Onveiligheidsgevoel" directly.
        // Since 'themes' is a string array, we can use array-container syntax if using Postgres
        // But Prisma syntax for array filtering:
      
        const summaries = await this.prisma.aISummary.findMany({
            where: {
                themes: {
                    has: 'Onveiligheidsgevoel'
                }
            },
            select: {
                userId: true
                // We might want to limit this to recently updated summaries if the user has many
                // But the requirement says "if you found, Onveiligheidsgevoel", implies checking all or active ones.
                // To be safe and efficient, we should probably check those that haven't been acted upon?
                // But we don't have a flag. So we will check ALL, and ensure their LATEST submission is RED.
                // If it is already RED, we skip.
            }
        });

        if (summaries.length === 0) {
            // this.logger.debug('No "Onveiligheidsgevoel" themes found.');
            return;
        }

        const userIds = [...new Set(summaries.map(s => s.userId))];
        this.logger.log(`Found ${userIds.length} users with "Onveiligheidsgevoel" theme.`);

        for (const userId of userIds) {
            await this.processUserSubmission(userId);
        }

    } catch (error) {
        this.logger.error('Error in handleThemeCheck cron job', error);
    }
  }

  private async processUserSubmission(userId: string) {
      try {
          // Get the latest submission
          const latestSubmission = await this.prisma.submission.findFirst({
              where: { userId },
              orderBy: { submittedAt: 'desc' },
          });

          if (!latestSubmission) return;

          // If color is not RED, update it
          if (latestSubmission.colorLevel !== ColorLevel.RED) {
              await this.prisma.submission.update({
                  where: { id: latestSubmission.id },
                  data: {
                      colorLevel: ColorLevel.RED,
                  }
              });
              this.logger.log(`Updated submission ${latestSubmission.id} for user ${userId} to RED due to "Onveiligheidsgevoel".`);
          }
      } catch (e) {
             this.logger.error(`Failed to process submission for user ${userId}`, e);
      }
  }
}
