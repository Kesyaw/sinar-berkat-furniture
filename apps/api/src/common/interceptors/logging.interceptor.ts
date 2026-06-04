import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    // Extract identifiers, defaulting to new UUIDs if missing
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.id ||
      request.headers['x-request-id'] ||
      crypto.randomUUID();
    const requestId = request.id || correlationId;
    const userId = request.user?.id;

    // Check request params, body, and query for payment / order context
    const orderId =
      request.params.orderId ||
      request.body?.orderId ||
      request.query?.orderId ||
      request.body?.order_id; // Midtrans style

    const paymentId =
      request.params.paymentId ||
      request.body?.paymentId ||
      request.query?.paymentId;

    const contextProps: Record<string, any> = {
      correlationId,
      requestId,
    };

    if (userId) contextProps.userId = userId;
    if (orderId) contextProps.orderId = orderId;
    if (paymentId) contextProps.paymentId = paymentId;

    // Dynamically assign context to the request-scoped logger
    this.logger.assign(contextProps);

    return next.handle();
  }
}
