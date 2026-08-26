import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { getAuthTokenFromRequest } from './auth-utils';
import { AUTHGUARD_OPTIONAL_KEY } from './decorators/auth-optional.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const optionalAuth = this.reflector.get(AUTHGUARD_OPTIONAL_KEY, context.getHandler());
    const request = context.switchToHttp().getRequest();
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      if (optionalAuth) {
        return true;
      }
      throw new UnauthorizedException();
    }
    try {
      await this.authService.verifyToken(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
