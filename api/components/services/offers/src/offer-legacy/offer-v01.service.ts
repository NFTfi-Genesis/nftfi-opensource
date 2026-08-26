import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';

@Injectable()
export class OfferV01Service {
  constructor(private readonly offerRepository: OfferRepository) {}

  async deleteById(id: number, account: string): Promise<void> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundException({ errors: { id: [`Offer ${id} not found`] } });
    }
    if (offer.lender.toLowerCase() !== account.toLowerCase()) {
      throw new UnauthorizedException({
        errors: { lender: ['Offer lender must match the authenticated account'] }
      });
    }
    await this.offerRepository.softDelete(id);
  }
}
