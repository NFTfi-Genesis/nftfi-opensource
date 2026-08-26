import { Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FindOptionsWhere } from 'typeorm';
import { Offer, OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { Config } from '../../config';
import { DraftOfferV1Dto } from '../dtos';

@Injectable()
export class OfferV1LimitValidationPipe implements PipeTransform<DraftOfferV1Dto> {
  constructor(private readonly offerRepository: OfferRepository, private readonly configService: ConfigService) {}

  async transform(offer: DraftOfferV1Dto): Promise<DraftOfferV1Dto> {
    const createLimit = this.configService.get<Config['validation']['createLimit']>('validation.createLimit')!;
    const max = createLimit[offer.type];

    const where: FindOptionsWhere<Offer> = {
      type: offer.type,
      lender: offer.lender.address,
      nftContract: offer.nft.contract,
      currency: offer.terms.loan.currency,
      prorated: offer.terms.loan.prorated,
      ...(offer.type === OfferType.Asset ? { nftTokenIdFrom: (offer.nft as { tokenId: string }).tokenId } : {})
    };

    const count = await this.offerRepository.count(where);
    if (count >= max) {
      throw new UnprocessableEntityException({
        errors: {
          limit: [`Cannot make more than ${max} offers per lender, per currency, per loan type and per ${offer.type}`]
        }
      });
    }

    return offer;
  }
}
