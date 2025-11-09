import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { successResponse } from '../../utils/response.util';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        // Safe check — if already wrapped, skip
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Otherwise, wrap using your standard success format
        return successResponse(data);
      }),
    );
  }
}
