import { isNil, isString } from 'lodash';
import { plainToInstance } from 'class-transformer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Account, AccountRepository, CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { ChainalysisFacade } from '@nftfi.api/facades/chainalysis';
import { AccountDto, UpdateAccountDto } from '@nftfi.api/facades/accounts/dtos';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly chainalysisFacade: ChainalysisFacade
  ) {}

  async getByWallet(wallet: string): Promise<Account> {
    const account = await this.accountRepository.findByWallet(wallet);
    if (!account) {
      throw new NotFoundException(`Account ${wallet} not found`);
    }
    return account;
  }

  async getAccountWithEmail(wallet: string): Promise<Account | null> {
    const account = await this.accountRepository.findByWallet(wallet);
    return isString(account?.email) ? account : null;
  }

  async update(accountAddress: string, payload: UpdateAccountDto): Promise<Account> {
    const comms = payload.communications
      ? Object.entries(payload.communications).reduce<
          Partial<Record<'refi' | 'maturity' | 'liquidity', CommsFrequency>>
        >((acc, [key, value]) => {
          if (!value) {
            return acc;
          }
          acc[key as 'refi' | 'maturity' | 'liquidity'] = value.frequency;
          return acc;
        }, {})
      : undefined;

    const account = await this.accountRepository.updateAccount({
      wallet: accountAddress,
      email: payload.email,
      username: payload.username,
      socials: payload.socials as Account['socials'],
      comms
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountAddress} not found`);
    }

    return account;
  }

  async isSanctioned(wallet: string): Promise<boolean> {
    const identifications = await this.chainalysisFacade.getIdentifications(wallet);
    return identifications.length > 0;
  }

  toDto(account?: Account | null): AccountDto | null {
    if (isNil(account)) return null;

    const comms = (account.comms ?? {}) as Partial<Record<'refi' | 'maturity' | 'liquidity', CommsFrequency>>;
    const dto: AccountDto = {
      wallet: account.wallet,
      username: account.username ?? null,
      email: account.email ?? null,
      socials: account.socials ?? {},
      communications: {
        refi: {
          frequency: comms.refi ?? CommsFrequency.Daily
        },
        maturity: {
          frequency: comms.maturity ?? CommsFrequency.Daily
        },
        liquidity: {
          frequency: comms.liquidity ?? CommsFrequency.Daily
        }
      }
    };
    return plainToInstance(AccountDto, dto, { excludeExtraneousValues: true });
  }
}
