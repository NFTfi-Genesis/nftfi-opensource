import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OfferController } from './offer-base.controller';

@Controller('v0.1/offers')
@ApiTags('v0.1')
export class OfferV01Controller extends OfferController {}
