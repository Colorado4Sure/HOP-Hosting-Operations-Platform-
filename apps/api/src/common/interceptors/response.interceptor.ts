import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  { success: true; data: T; requestId?: string }
> {
  intercept(context: ExecutionContext, next: CallHandler<T>) {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers["x-request-id"] as string | undefined;

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        ...(requestId ? { requestId } : {}),
      })),
    );
  }
}
