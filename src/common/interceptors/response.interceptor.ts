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
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result) => {

        // If service already returns { success: true | false, ... }
        if (
          result &&
          typeof result === 'object' &&
          'success' in result
        ) {
          return result; // DO NOT wrap
        }

        // Otherwise wrap normally
        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}

