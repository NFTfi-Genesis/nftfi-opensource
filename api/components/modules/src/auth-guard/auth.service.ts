import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type AuthModuleConfig, type AuthTokenPayload, AuthModuleConfigToken } from './auth.types';

@Injectable()
export class AuthService {
  constructor(@Inject(AuthModuleConfigToken) private config: AuthModuleConfig, private jwtService: JwtService) {}

  isTokenOwner(authToken: AuthTokenPayload, applicant: string): boolean {
    return authToken.account.toLowerCase() === applicant.toLowerCase();
  }

  async verifyToken(token: string): Promise<AuthTokenPayload> {
    return this.jwtService.verifyAsync(token, { secret: this.config.secret });
  }
}
