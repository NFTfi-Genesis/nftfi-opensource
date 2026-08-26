import { Body, Controller, Post, HttpStatus, HttpCode, UsePipes, UseFilters, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { rpcValidationPipe } from '@nftfi.api/validation';
import { RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { QueueTopic } from '@nftfi.api/facades/email-notifications';
import { EmailDto } from './dtos/email.dto';
import { MailerService } from './mailer.service';

@Controller()
@ApiTags()
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('/notifications/mailer')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity',
    type: ResponseErrorsDto
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict'
  })
  async handlePost(@Body() data: EmailDto): Promise<void> {
    await this.mailerService.create(data);
  }

  @UsePipes(rpcValidationPipe)
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(QueueTopic.Message)
  async onEmail(@Payload() data: EmailDto): Promise<void> {
    await this.mailerService.create(data);
  }
}
