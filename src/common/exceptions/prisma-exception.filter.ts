import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { errorResponse } from '../../utils/response.util';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Database error occurred';

    switch (exception.code) {
      case 'P2002':
        message = `Unique constraint failed on field(s): ${exception.meta?.target}`;
        status = HttpStatus.CONFLICT;
        break;
      case 'P2025':
        message = 'Record not found';
        status = HttpStatus.NOT_FOUND;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'P2014':
        message = 'Invalid relation detected';
        status = HttpStatus.BAD_REQUEST;
        break;
      default:
        message = exception.message;
        status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    response.status(status).json(errorResponse('PrismaError', message));
  }
}
