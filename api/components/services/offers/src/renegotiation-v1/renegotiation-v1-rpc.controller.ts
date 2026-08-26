import { Controller, UseFilters, UseInterceptors, UsePipes } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HttpToRpcExceptionFilter } from '@nftfi.api/core/filters';
import { RpcLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { rpcValidationPipe } from '@nftfi.api/validation';
import { type AcceptRenegotiationPayload, OffersQueueTopic } from '@nftfi.api/facades/offers';
import { RenegotiationV1Service } from './renegotiation-v1.service';

@Controller()
export class RenegotiationV1RpcController {
  constructor(private readonly renegotiationService: RenegotiationV1Service) {}

  @UsePipes(rpcValidationPipe)
  @UseFilters(HttpToRpcExceptionFilter)
  @UseInterceptors(RpcLoggingInterceptor)
  @EventPattern(OffersQueueTopic.AcceptRenegotiation)
  async onAcceptRenegotiation(@Payload() payload: AcceptRenegotiationPayload): Promise<void> {
    await this.renegotiationService.acceptByLoan(payload.loanId, payload.contract);
  }
}
