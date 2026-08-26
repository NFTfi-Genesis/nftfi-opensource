import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AccountsQueueTopic, type GetAccountWithEmailParams, type AccountWithEmail } from '@nftfi.api/facades/accounts';
import { type RPCResponse } from '@nftfi.api/facades/queue';
import { AccountService } from './account.service';

@Controller()
export class AccountRpcController {
  constructor(private readonly accountService: AccountService) {}

  @MessagePattern(AccountsQueueTopic.GetAccountWithEmail)
  async getAccountWithEmail(
    @Payload() { wallet }: GetAccountWithEmailParams
  ): Promise<RPCResponse<AccountWithEmail | null>> {
    const account = await this.accountService.getAccountWithEmail(wallet);
    return { data: this.accountService.toDto(account) as AccountWithEmail };
  }
}
