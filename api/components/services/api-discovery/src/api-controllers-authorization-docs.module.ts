import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Accounts from '@nftfi.api/services/accounts';

@Module({
  controllers: [Accounts.AuthV1Controller, Accounts.AuthV01Controller],
  providers: [
    { provide: Accounts.AuthService, useValue: {} },
    { provide: JwtService, useValue: {} }
  ]
})
export class ApiControllersAuthorizationDocsModule {}
