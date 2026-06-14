import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Injects the authenticated JWT user from request.user */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
