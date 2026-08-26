import { Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config';
import { DEFAULT_RENEGOTIATION_MAX_DURATION_SECONDS } from '../renegotiation-v1.types';
import { DraftRenegotiationV1Dto } from '../dtos';

@Injectable()
export class RenegotiationV1DurationValidationPipe implements PipeTransform<DraftRenegotiationV1Dto> {
  constructor(private readonly configService: ConfigService) {}

  transform(draft: DraftRenegotiationV1Dto): DraftRenegotiationV1Dto {
    const max =
      this.configService.get<Config['renegotiation']['maxDurationSeconds']>('renegotiation.maxDurationSeconds') ??
      DEFAULT_RENEGOTIATION_MAX_DURATION_SECONDS;
    const { duration } = draft.terms.loan;
    if (duration <= 0 || duration > max) {
      throw new UnprocessableEntityException({
        errors: {
          'terms.loan.duration': [`duration must be a positive integer ≤ ${max} seconds`]
        }
      });
    }
    return draft;
  }
}
