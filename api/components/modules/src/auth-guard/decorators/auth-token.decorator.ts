import * as express from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { getAuthTokenFromRequest, getDecodedAuthTokenFromRequest } from '../auth-utils';

export const AuthToken = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request: express.Request = ctx.switchToHttp().getRequest();
  return getAuthTokenFromRequest(request);
});

export const DecodedAuthToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Partial<AuthTokenPayload> => {
    const request: express.Request = ctx.switchToHttp().getRequest();
    return getDecodedAuthTokenFromRequest(request) || {};
  }
);
