import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, AccountContact, AccountRepository } from '@nftfi.api/repositories/postgres/account';
import { AccountRpcController } from './account-rpc.controller';
import { AccountV1Controller } from './account-v1.controller';
import { AccountContactPipe } from './account-contact.pipe';
import { AccountPipe } from './account.pipe';
import { AccountService } from './account.service';
import { ContactService } from './contact.service';
import { ContactV1Controller } from './contact-v1.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Account, AccountContact])],
  controllers: [AccountV1Controller, ContactV1Controller, AccountRpcController],
  providers: [AccountService, ContactService, AccountRepository, AccountPipe, AccountContactPipe],
  exports: [AccountService, AccountRepository]
})
export class AccountModule {}
