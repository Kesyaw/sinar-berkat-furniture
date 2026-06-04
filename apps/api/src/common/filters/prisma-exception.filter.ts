import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * PrismaClientExceptionFilter
 *
 * Catches Prisma runtime errors that bubble up through NestJS and maps them
 * to appropriate HTTP responses instead of letting them surface as raw 500s.
 *
 * Handled error codes:
 *  P2002 - Unique constraint violation         → 409 Conflict
 *  P2025 - Record not found (update/delete)    → 404 Not Found
 *  P2003 - Foreign key constraint violation    → 409 Conflict
 *  P2014 - Relation violation                  → 409 Conflict
 *  All other Prisma errors                     → 500 Internal Server Error
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const { code, meta } = exception;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const fields = Array.isArray(meta?.target)
          ? (meta.target as string[]).join(', ')
          : String(meta?.target ?? 'unknown');
        message = `A record with this ${fields} already exists`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = (meta?.cause as string | undefined) ?? 'Record not found';
        break;
      }
      case 'P2003': {
        status = HttpStatus.CONFLICT;
        message = `Foreign key constraint failed on field: ${meta?.field_name ?? 'unknown'}`;
        break;
      }
      case 'P2014': {
        status = HttpStatus.CONFLICT;
        message =
          'Relation violation — the change would violate a required relation';
        break;
      }
      default: {
        // Log unknown Prisma errors with their code for triage
        this.logger.error(
          `Unhandled Prisma error code ${code} on ${request.method} ${request.url}: ${exception.message}`,
        );
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error';
        break;
      }
    }

    this.logger.warn(
      `Prisma ${code} on ${request.method} ${request.url} → HTTP ${status}: ${message}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
