import { getResponseBodyDto } from '@nftfi.api/core/dtos';
import { OfferDto } from './offer.dto';
import { OfferCountDto } from './offer-count.dto';

export const ResponseOfferDto = getResponseBodyDto(OfferDto);

export const ResponseOffersCountDto = getResponseBodyDto(OfferCountDto);
