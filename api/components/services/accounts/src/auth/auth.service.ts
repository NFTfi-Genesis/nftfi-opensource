import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { AccountRepository } from '@nftfi.api/repositories/postgres/account';
import { EthersFacade } from '@nftfi.api/modules/ethers-provider';
import { Config } from '../config';
import { AuthenticateDto, MultisigDto, TokenDto } from './dtos';
import { RefreshTokenStore } from './refresh-token.store';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly accountRepository: AccountRepository,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly ethersFacade: EthersFacade
  ) {}

  async authenticate(
    { message, signedMessage, nonce, accountAddress, multisig }: AuthenticateDto,
    ipAddress: string
  ): Promise<TokenDto> {
    if (!(await this.verifySignature(message, signedMessage, nonce, accountAddress))) {
      throw new UnprocessableEntityException({ errors: { signedMessage: ['Signature is invalid'] } });
    }

    const refreshTokenValue = this.generateTokenString();
    await this.refreshTokenStore.save({
      account: accountAddress.toLowerCase(),
      multisig,
      token: refreshTokenValue,
      createdMs: Date.now(),
      createdByIp: ipAddress
    });

    await this.accountRepository.setAccountSignedTerms({ wallet: accountAddress, message, signedMessage });

    return {
      token: this.signJwt(accountAddress, multisig),
      refreshToken: refreshTokenValue
    };
  }

  async refreshToken(refreshTokenValue: string, ipAddress: string): Promise<TokenDto> {
    const existing = await this.refreshTokenStore.findActive(refreshTokenValue);
    if (!existing) {
      throw new UnprocessableEntityException({ errors: { refreshToken: ['Token is invalid or expired'] } });
    }

    const newRefreshTokenValue = this.generateTokenString();
    await this.refreshTokenStore.revoke(refreshTokenValue);
    await this.refreshTokenStore.save({
      account: existing.account,
      multisig: existing.multisig,
      token: newRefreshTokenValue,
      createdMs: Date.now(),
      createdByIp: ipAddress
    });

    return {
      token: this.signJwt(existing.account, existing.multisig),
      refreshToken: newRefreshTokenValue
    };
  }

  private async verifySignature(
    message: string,
    signature: string,
    nonce: string,
    expectedAccount: string
  ): Promise<boolean> {
    const chainId = await this.ethersFacade.getChainId();
    try {
      const originalMessage = `${message}\r\n\r\nChainId : ${chainId}\r\nNonce : ${nonce})`;
      const recovered = ethers.utils.verifyMessage(originalMessage, signature);
      return recovered.toLowerCase() === expectedAccount.toLowerCase();
    } catch {
      return false;
    }
  }

  private signJwt(account: string, multisig?: MultisigDto | { type?: string }): string {
    const config = this.configService.get<Config['jwt']>('jwt')!;
    return this.jwtService.sign({ account, multisig }, { secret: config.secret, expiresIn: config.ttl });
  }

  private generateTokenString(): string {
    return crypto.randomBytes(40).toString('hex');
  }
}
