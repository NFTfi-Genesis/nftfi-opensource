import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthParam } from './decorators/auth-param.decorator';
import { getDecodedAuthTokenFromRequest } from './auth-utils';

@Injectable()
export class AuthParamGuard {
  constructor(private readonly reflector: Reflector, private readonly authService: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const param = this.reflector.get(AuthParam, context.getHandler());
    const request: Request = context.switchToHttp().getRequest();
    const value = request.params[param];
    if (!value) {
      return false;
    }

    const tokenPayload = getDecodedAuthTokenFromRequest(request);
    if (!tokenPayload) {
      return false;
    }

    return this.authService.isTokenOwner(tokenPayload, value);
  }
}
