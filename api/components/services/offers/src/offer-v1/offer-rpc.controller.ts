import { Controller, UseFilters, UseInterceptors, UsePipes } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { rpcValidationPipe } from '@nftfi.api/validation';
import { type WinningOfferKey, OffersQueueTopic } from '@nftfi.api/facades/offers';
import { OfferV1Service } from './offer-v1.service';

@Controller()
export class OfferRpcController {
  constructor(private readonly offerV1Service: OfferV1Service) {}

  @UsePipes(rpcValidationPipe)
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(OffersQueueTopic.DeleteWinningOffer)
  async onDeleteWinningOffer(@Payload() payload: WinningOfferKey): Promise<void> {
    await this.offerV1Service.deleteWinningOffer(payload);
  }

  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(OffersQueueTopic.InvalidateCache)
  async onInvalidateCache(): Promise<void> {
    await this.offerV1Service.invalidateCache();
  }
}
