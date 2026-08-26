import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UseInterceptors, UsePipes } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ResponseErrorsDto } from '@nftfi.api/core/dtos';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { DiscordMessageDto, QueueTopic } from '@nftfi.api/facades/discord-notifications';
import { rpcValidationPipe } from '@nftfi.api/validation';
import { RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { DiscordBotService } from './discord-bot.service';

@Controller()
@ApiTags()
export class DiscordBotController {
  constructor(private readonly discordBotService: DiscordBotService) {}

  @Post('/notifications/discord-bot')
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
  async handlePost(@Body() data: DiscordMessageDto): Promise<void> {
    await this.discordBotService.create(data);
  }

  @UsePipes(rpcValidationPipe)
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(QueueTopic.Message)
  async onMessage(@Payload() data: DiscordMessageDto): Promise<void> {
    await this.discordBotService.create(data);
  }
}
