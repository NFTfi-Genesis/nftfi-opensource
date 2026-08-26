import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { Renegotiation, RenegotiationRepository } from '@nftfi.api/repositories/postgres/renegotiation';
import { RenegotiationV1Controller } from './renegotiation-v1.controller';
import { RenegotiationV1RpcController } from './renegotiation-v1-rpc.controller';
import { RenegotiationV1Scheduler } from './renegotiation-v1.scheduler';
import { RenegotiationV1Service } from './renegotiation-v1.service';
import { RenegotiationV1DurationValidationPipe, RenegotiationV1OfferValidationPipe } from './pipes';

@Module({
  imports: [TypeOrmModule.forFeature([Renegotiation, MarketLoan])],
  controllers: [RenegotiationV1Controller, RenegotiationV1RpcController],
  providers: [
    RenegotiationV1Service,
    RenegotiationV1Scheduler,
    RenegotiationRepository,
    MarketLoanRepository,
    RenegotiationV1DurationValidationPipe,
    RenegotiationV1OfferValidationPipe
  ]
})
export class RenegotiationV1Module {}
