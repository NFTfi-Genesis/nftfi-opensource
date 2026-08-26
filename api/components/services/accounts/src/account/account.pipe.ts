import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Account } from '@nftfi.api/repositories/postgres/account';
import { AccountService } from './account.service';

export type AccountPipeParams = {
  address?: string;
};

@Injectable()
export class AccountPipe implements PipeTransform {
  constructor(private readonly accountService: AccountService) {}

  async transform(params: AccountPipeParams): Promise<Account> {
    if (!params.address) {
      throw new BadRequestException('Address is required');
    }
    return this.accountService.getByWallet(params.address);
  }
}
