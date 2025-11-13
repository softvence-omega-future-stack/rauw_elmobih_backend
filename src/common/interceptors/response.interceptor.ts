import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Response<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((result) => {
        const now = new Date().toISOString();

        if (result && typeof result === 'object' && 'message' in result) {
          const { message, ...data } = result;
          return {
            success: true,
            message,
            data,
            timestamp: now,
          };
        }
        return {
          success: true,
          data: result,
          timestamp: now,
        };
      }),
    );
  }
}