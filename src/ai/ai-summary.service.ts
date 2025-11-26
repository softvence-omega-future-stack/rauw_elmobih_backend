import {
  Injectable,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiSummaryService {
  private readonly baseUrl: string;
  private readonly AI_URL: string;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('AI_SUMMARY_API');

    if (!url) {
      throw new Error('AI_SUMMARY_API is missing in .env');
    }

    this.baseUrl = url;
    this.AI_URL = url; // ✅ Safe, guaranteed string now
  }

  async getSummary(userId: string) {
    try {
      console.log('-------------------------axiosone--------------------------------------------');
      const response = await axios.post(this.baseUrl, {
        user_id: userId,
      });
      console.log('-------------------------axiostwo--------------------------------------------');
      console.log(response.data);
      console.log('-------------------------axiostwoend--------------------------------------------');

      return response.data;
    } catch (error: any) {
      throw new HttpException(
        `Failed to fetch AI summary: ${error.message}`,
        500,
      );
    }
  }

  async generateSubmissionSummary(payload: {
    userId: string;
    responses: any;
    score: number;
    colorLevel: string;
  }) {
    try {
      const response = await axios.post(this.AI_URL, payload);

      return response.data; // { summary: string, themes: string[] }
    } catch (error: any) {
      console.error('AI API Error:', error?.response?.data || error.message);

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to generate AI insight',
        error: 'AI_API_FAILED',
      });
    }
  }
}
