import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountService } from '../account';
import { RefreshTokenStore } from './refresh-token.store';
import { AuthV1Controller } from './auth-v1.controller';
import { AuthService } from './auth.service';
import { AuthV01Controller } from './auth-v01.controller';

@Module({
  imports: [JwtModule],
  controllers: [AuthV1Controller, AuthV01Controller],
  providers: [AccountService, AuthService, RefreshTokenStore]
})
export class AuthModule {}
