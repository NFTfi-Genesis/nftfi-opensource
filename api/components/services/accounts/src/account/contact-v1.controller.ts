import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { AuthParam, AuthParamGuard, AuthGuard } from '@nftfi.api/modules/auth-guard';
import { type Account } from '@nftfi.api/repositories/postgres/account';
import { ContactDto, DraftContactDto } from '@nftfi.api/facades/accounts/dtos';
import { AccountPipe } from './account.pipe';
import { type AccountContactTuple, AccountContactPipe } from './account-contact.pipe';
import { ContactService } from './contact.service';

@Controller('/v1/accounts/:address/contacts')
@UseGuards(AuthGuard)
@ApiTags('accounts')
@ApiSecurity('api-key')
@ApiParam({ name: 'address', type: String })
@ApiBearerAuth()
@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized', type: ResponseErrorsDto })
@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request', type: ResponseErrorsDto })
export class ContactV1Controller {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @AuthParam('address')
  @UseGuards(AuthParamGuard)
  @ApiOperation({ operationId: 'ContactV1Controller_getContacts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ok', type: ContactDto, isArray: true })
  async getContacts(@Param(AccountPipe) account: Account): Promise<ContactDto[]> {
    const contacts = await this.contactService.getByAccount(account);
    return contacts.map(this.contactService.toDto.bind(this.contactService));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuthParam('address')
  @UseGuards(AuthParamGuard)
  @ApiOperation({ operationId: 'ContactV1Controller_createContact' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created', type: ContactDto })
  @ApiBody({ type: DraftContactDto })
  async createContact(
    @Param(AccountPipe) account: Account,
    @Body() draftContact: DraftContactDto
  ): Promise<ContactDto> {
    const contact = await this.contactService.create(account, draftContact);
    return this.contactService.toDto(contact);
  }

  @Put(':contactId')
  @HttpCode(HttpStatus.OK)
  @AuthParam('address')
  @UseGuards(AuthParamGuard)
  @ApiOperation({ operationId: 'ContactV1Controller_updateContact' })
  @ApiParam({ name: 'contactId', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Updated', type: ContactDto })
  @ApiBody({ type: DraftContactDto })
  async updateContact(
    @Param(AccountContactPipe) accountContact: AccountContactTuple,
    @Body() draftContact: DraftContactDto
  ): Promise<ContactDto> {
    const [account, contact] = accountContact;
    const updatedContact = await this.contactService.update(account, contact, draftContact);
    return this.contactService.toDto(updatedContact);
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthParam('address')
  @UseGuards(AuthParamGuard)
  @ApiOperation({ operationId: 'ContactV1Controller_deleteContact' })
  @ApiParam({ name: 'contactId', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted' })
  async deleteContact(@Param(AccountContactPipe) accountContact: AccountContactTuple): Promise<void> {
    const [account, contact] = accountContact;
    await this.contactService.delete(account, contact);
  }
}
