import { Body, Controller, Get, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { AuthParam, AuthParamGuard, AuthGuard } from '@nftfi.api/modules/auth-guard';
import { type Account } from '@nftfi.api/repositories/postgres/account';
import { AccountDto, AccountParamsDto, AccountSanctionedDto, UpdateAccountDto } from '@nftfi.api/facades/accounts/dtos';
import { AccountPipe } from './account.pipe';
import { AccountService } from './account.service';

@Controller('/v1/accounts/:address')
@ApiTags('accounts')
@ApiSecurity('api-key')
@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request', type: ResponseErrorsDto })
export class AccountV1Controller {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @AuthParam('address')
  @UseGuards(AuthGuard, AuthParamGuard)
  @ApiOperation({ operationId: 'AccountV1Controller_getAccount' })
  @ApiBearerAuth()
  @ApiParam({ name: 'address', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: AccountDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized', type: ResponseErrorsDto })
  async getAccount(@Param(AccountPipe) account: Account): Promise<AccountDto> {
    return this.accountService.toDto(account)!;
  }

  @Patch()
  @AuthParam('address')
  @UseGuards(AuthGuard, AuthParamGuard)
  @ApiOperation({ operationId: 'AccountV1Controller_updateAccount' })
  @ApiBearerAuth()
  @ApiParam({ name: 'address', type: String })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: AccountDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized', type: ResponseErrorsDto })
  async updateAccount(
    @Param(AccountPipe) account: Account,
    @Body() updateAccountDto: UpdateAccountDto
  ): Promise<AccountDto> {
    const updated = await this.accountService.update(account.wallet, updateAccountDto);
    return this.accountService.toDto(updated)!;
  }

  @Get('sanctioned')
  @ApiParam({ name: 'address', type: String })
  @ApiOperation({ operationId: 'AccountV1Controller_isSanctioned' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: AccountSanctionedDto })
  async isSanctioned(@Param() { address }: AccountParamsDto): Promise<AccountSanctionedDto> {
    const flagged = await this.accountService.isSanctioned(address);
    return { wallet: address, flagged };
  }
}
