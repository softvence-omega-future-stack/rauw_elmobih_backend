import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiSummaryService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('AI_SUMMARY_API');

    if (!url) {
      throw new Error('AI_SUMMARY_API is missing in .env');
    }

    this.baseUrl = url;
  }

  async getSummary(userId: string) {
    try {
      console.log('-------------------------axiosone--------------------------------------------');
      const response = await axios.post(this.baseUrl, { user_id: userId });
      console.log('-------------------------axiostwo--------------------------------------------');
        console.log(response.data);
       console.log('-------------------------axiostwoend--------------------------------------------');
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch AI summary: ${error.message}`,
        500,
      );
    }
  }
}
