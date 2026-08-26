import { BadRequestException, Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { Account, AccountContact } from '@nftfi.api/repositories/postgres/account';
import { AccountService } from './account.service';

export type AccountContactTuple = [Account, AccountContact];

export type AccountContactPipeParams = {
  address: string;
  contactId: string;
};

@Injectable()
export class AccountContactPipe implements PipeTransform {
  constructor(private readonly accountService: AccountService) {}

  async transform(params: AccountContactPipeParams): Promise<AccountContactTuple> {
    if (!params.address || !params.contactId) {
      throw new BadRequestException('Address and contactId are required');
    }
    const account = await this.accountService.getByWallet(params.address);
    const contactId = parseInt(params.contactId, 10);
    if (isNaN(contactId)) {
      throw new BadRequestException('contactId must be a number');
    }
    const contact = account.contacts.find(c => c.id === contactId);
    if (!contact) {
      throw new NotFoundException(`Contact ${params.contactId} not found`);
    }
    return [account, contact];
  }
}
