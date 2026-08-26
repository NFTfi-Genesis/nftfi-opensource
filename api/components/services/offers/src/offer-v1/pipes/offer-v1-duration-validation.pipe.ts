import { Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config';
import { DraftOfferV1Dto } from '../dtos';

const FALLBACK_MIN_DURATION_SECONDS = 86400;

@Injectable()
export class OfferV1DurationValidationPipe implements PipeTransform<DraftOfferV1Dto> {
  constructor(private readonly configService: ConfigService) {}

  transform(offer: DraftOfferV1Dto): DraftOfferV1Dto {
    const configured = Number(
      this.configService.get<Config['validation']['minimumLoanDurationSeconds']>(
        'validation.minimumLoanDurationSeconds'
      )
    );
    const minDuration = isNaN(configured) ? FALLBACK_MIN_DURATION_SECONDS : configured;
    const { duration } = offer.terms.loan;
    const isValid = duration > 0 && duration % minDuration === 0;

    if (!isValid) {
      throw new UnprocessableEntityException({
        errors: {
          'terms.loan.duration': [
            `duration must be specified in seconds, and in ${minDuration} seconds increments (eg. ${minDuration}, ${
              minDuration * 2
            }, ${minDuration * 3})`
          ]
        }
      });
    }

    return offer;
  }
}
