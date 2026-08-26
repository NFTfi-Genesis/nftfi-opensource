import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import {
  DraftRenegotiation,
  Renegotiation,
  RenegotiationParty,
  RenegotiationRepository,
  RenegotiationStatus
} from '@nftfi.api/repositories/postgres/renegotiation';
import {
  DraftRenegotiationV1Dto,
  RenegotiationV1Dto,
  RenegotiationV1QueryDto,
  RenegotiationV1SortDirection,
  RenegotiationV1SortField
} from './dtos';

@Injectable()
export class RenegotiationV1Service {
  private readonly logger = new Logger(RenegotiationV1Service.name);

  constructor(
    private readonly renegotiationRepository: RenegotiationRepository,
    private readonly marketLoanRepository: MarketLoanRepository
  ) {}

  async create(draft: DraftRenegotiationV1Dto): Promise<Renegotiation> {
    const loan = await this.marketLoanRepository.findById(draft.loan.id);
    if (!loan) {
      throw new NotFoundException({ errors: { 'loan.id': [`Loan ${draft.loan.id} not found`] } });
    }

    const replacePrevious = await this.renegotiationRepository.findActiveByLoanAndParty(
      loan.loanId,
      loan.contract,
      RenegotiationParty.Lender
    );
    if (replacePrevious) {
      await this.renegotiationRepository.softDeleteReplaced(replacePrevious.id);
    }

    const persisted: DraftRenegotiation = {
      status: RenegotiationStatus.Active,
      party: RenegotiationParty.Lender,
      borrower: loan.borrower,
      lender: draft.lender.address,
      lenderNonce: draft.lender.nonce,
      duration: draft.terms.loan.duration,
      renegotiationFee: draft.terms.loan.renegotiationFee,
      expiresAt: draft.terms.loan.expiresAt,
      signature: draft.signature,
      message: draft.message ?? null,
      loan: { id: loan.id }
    };

    const entity = await this.renegotiationRepository.create(persisted);
    entity.loan = loan;
    return entity;
  }

  async getById(id: number): Promise<Renegotiation> {
    const entity = await this.renegotiationRepository.findById(id);
    if (!entity) {
      throw new NotFoundException({ errors: { id: [`Renegotiation ${id} not found`] } });
    }
    return entity;
  }

  async getMany(query: RenegotiationV1QueryDto): Promise<Renegotiation[]> {
    const skip = (query.page - 1) * query.limit;
    const direction = query.direction === RenegotiationV1SortDirection.Asc ? 'ASC' : 'DESC';
    const sortField = query.sort || RenegotiationV1SortField.CreatedAt;
    return this.renegotiationRepository.findSortPaginateBy(this.buildFilters(query), {
      skip,
      limit: query.limit,
      sort: { by: sortField, direction }
    });
  }

  async count(query: RenegotiationV1QueryDto): Promise<number> {
    return this.renegotiationRepository.countBy(this.buildFilters(query));
  }

  async deleteById(id: number, account: string): Promise<void> {
    const entity = await this.renegotiationRepository.findById(id);
    if (!entity) {
      throw new NotFoundException({ errors: { id: [`Renegotiation ${id} not found`] } });
    }
    const author = entity.party === RenegotiationParty.Borrower ? entity.borrower : entity.lender;
    if (author.toLowerCase() !== account.toLowerCase()) {
      throw new UnauthorizedException({
        errors: { party: ['Authenticated wallet must match the renegotiation author'] }
      });
    }
    if (entity.status !== RenegotiationStatus.Active || entity.deletedAt) {
      throw new UnprocessableEntityException({
        errors: { status: ['Only active renegotiation offers can be cancelled'] }
      });
    }
    await this.renegotiationRepository.softDeleteCancelled(id);
  }

  async acceptByLoan(loanId: string, contract: string): Promise<void> {
    const affected = await this.renegotiationRepository.acceptActiveByLoan(loanId, contract.toLowerCase());
    if (affected > 0) {
      this.logger.log(`Accepted ${affected} renegotiation row(s) for ${contract}#${loanId}`);
    }
  }

  async markExpired(): Promise<void> {
    const affected = await this.renegotiationRepository.softDeleteExpired();
    if (affected > 0) {
      this.logger.log(`Expired ${affected} stale renegotiation row(s)`);
    }
  }

  async toDtos(entities: Renegotiation[]): Promise<RenegotiationV1Dto[]> {
    return entities.map(entity => this.buildDto(entity));
  }

  private buildDto(entity: Renegotiation): RenegotiationV1Dto {
    const plain: RenegotiationV1Dto = {
      id: entity.id,
      loan: { id: entity.loan.loanId, contract: entity.loan.contract },
      status: entity.status,
      party: entity.party,
      lender: { address: entity.lender, nonce: entity.lenderNonce },
      borrower: { address: entity.borrower },
      terms: {
        loan: {
          duration: entity.duration,
          renegotiationFee: entity.renegotiationFee,
          expiresAt: entity.expiresAt
        }
      },
      signature: entity.signature,
      message: entity.message,
      createdAt: entity.createdAt
    };
    return plainToInstance(RenegotiationV1Dto, plain);
  }

  private buildFilters(query: RenegotiationV1QueryDto): Parameters<RenegotiationRepository['findSortPaginateBy']>[0] {
    return {
      loanId: query.loanId,
      contract: query.contract,
      lender: query.lender,
      borrower: query.borrower,
      party: query.party,
      status: query.status,
      statusIn: query.statusIn
    };
  }
}
