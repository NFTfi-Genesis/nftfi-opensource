import { NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import {
  RenegotiationParty,
  RenegotiationRepository,
  RenegotiationStatus
} from '@nftfi.api/repositories/postgres/renegotiation';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { buildPostgresRenegotiation } from '@nftfi.api/repositories/postgres/factories/renegotiation';
import { RenegotiationV1Service } from '../src/renegotiation-v1';
import {
  DraftRenegotiationV1Dto,
  RenegotiationV1QueryDto,
  RenegotiationV1SortDirection,
  RenegotiationV1SortField
} from '../src/renegotiation-v1/dtos';

describe(RenegotiationV1Service.name, () => {
  let service: RenegotiationV1Service;
  let renegotiationRepository: jest.Mocked<
    Pick<
      RenegotiationRepository,
      | 'create'
      | 'findById'
      | 'findActiveByLoanAndParty'
      | 'findSortPaginateBy'
      | 'countBy'
      | 'acceptActiveByLoan'
      | 'softDeleteCancelled'
      | 'softDeleteReplaced'
      | 'softDeleteExpired'
    >
  >;
  let marketLoanRepository: jest.Mocked<Pick<MarketLoanRepository, 'findById'>>;

  const buildDraft = (overrides: Partial<DraftRenegotiationV1Dto> = {}): DraftRenegotiationV1Dto =>
    ({
      loan: { id: 42 },
      lender: { address: '0xlender', nonce: 'n-42' },
      terms: {
        loan: {
          duration: 86400,
          renegotiationFee: '10000000000000000',
          expiresAt: new Date('2099-06-19T23:30:18.000Z')
        }
      },
      signature: '0xsig',
      message: 'Please extend',
      ...overrides
    } as DraftRenegotiationV1Dto);

  beforeEach(async () => {
    jest.resetAllMocks();

    renegotiationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findActiveByLoanAndParty: jest.fn(),
      findSortPaginateBy: jest.fn(),
      countBy: jest.fn(),
      acceptActiveByLoan: jest.fn(),
      softDeleteCancelled: jest.fn(),
      softDeleteReplaced: jest.fn(),
      softDeleteExpired: jest.fn()
    };
    marketLoanRepository = { findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RenegotiationV1Service,
        { provide: RenegotiationRepository, useValue: renegotiationRepository },
        { provide: MarketLoanRepository, useValue: marketLoanRepository }
      ]
    }).compile();

    service = moduleRef.get(RenegotiationV1Service);
  });

  describe(RenegotiationV1Service.prototype.create.name, () => {
    it('throws NotFound when the underlying loan does not exist', async () => {
      marketLoanRepository.findById.mockResolvedValue(null);

      await expect(service.create(buildDraft())).rejects.toThrow(NotFoundException);
      expect(marketLoanRepository.findById).toHaveBeenCalledWith(42);
      expect(renegotiationRepository.create).not.toHaveBeenCalled();
    });

    it('persists a lender offer with party hardcoded to Lender and borrower copied from the loan', async () => {
      const loan = buildPostgresMarketLoan({
        id: 42,
        loanId: '1',
        contract: '0xcontract',
        borrower: '0xloanborrower'
      });
      marketLoanRepository.findById.mockResolvedValue(loan);
      renegotiationRepository.findActiveByLoanAndParty.mockResolvedValue(null);
      const created = buildPostgresRenegotiation({ id: 7, loan });
      renegotiationRepository.create.mockResolvedValue(created);

      const result = await service.create(buildDraft());

      expect(result).toBe(created);
      expect(renegotiationRepository.create).toHaveBeenCalledWith({
        status: RenegotiationStatus.Active,
        party: RenegotiationParty.Lender,
        borrower: '0xloanborrower',
        lender: '0xlender',
        lenderNonce: 'n-42',
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        signature: '0xsig',
        message: 'Please extend',
        loan: { id: 42 }
      });
    });

    it('falls back to null message when the draft omits it', async () => {
      const loan = buildPostgresMarketLoan({ id: 42, loanId: '1', contract: '0xcontract' });
      marketLoanRepository.findById.mockResolvedValue(loan);
      renegotiationRepository.findActiveByLoanAndParty.mockResolvedValue(null);
      renegotiationRepository.create.mockResolvedValue(buildPostgresRenegotiation({ loan }));

      await service.create(buildDraft({ message: undefined as unknown as DraftRenegotiationV1Dto['message'] }));

      expect(renegotiationRepository.create).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
    });

    it('soft-deletes the prior lender offer as Replaced before inserting the new row', async () => {
      const loan = buildPostgresMarketLoan({ id: 42, loanId: '1', contract: '0xcontract' });
      marketLoanRepository.findById.mockResolvedValue(loan);
      renegotiationRepository.findActiveByLoanAndParty.mockResolvedValue(
        buildPostgresRenegotiation({ id: 99, party: RenegotiationParty.Lender, loan })
      );
      renegotiationRepository.create.mockResolvedValue(buildPostgresRenegotiation({ loan }));

      await service.create(buildDraft());

      expect(renegotiationRepository.findActiveByLoanAndParty).toHaveBeenCalledWith(
        '1',
        '0xcontract',
        RenegotiationParty.Lender
      );
      expect(renegotiationRepository.softDeleteReplaced).toHaveBeenCalledWith(99);
    });
  });

  describe(RenegotiationV1Service.prototype.getById.name, () => {
    it('returns the entity when found', async () => {
      const entity = buildPostgresRenegotiation({ id: 7 });
      renegotiationRepository.findById.mockResolvedValue(entity);

      const result = await service.getById(7);

      expect(result).toBe(entity);
    });

    it('throws NotFound when the entity is missing', async () => {
      renegotiationRepository.findById.mockResolvedValue(null);

      await expect(service.getById(7)).rejects.toThrow(NotFoundException);
    });
  });

  describe(RenegotiationV1Service.prototype.getMany.name, () => {
    it('passes filters, pagination and sort to the repository', async () => {
      renegotiationRepository.findSortPaginateBy.mockResolvedValue([]);

      const query = {
        page: 2,
        limit: 25,
        sort: RenegotiationV1SortField.ExpiresAt,
        direction: RenegotiationV1SortDirection.Asc,
        loanId: '1',
        contract: '0xcontract',
        lender: '0xlender',
        borrower: '0xborrower',
        party: RenegotiationParty.Lender,
        status: RenegotiationStatus.Active,
        statusIn: undefined as never
      } as unknown as RenegotiationV1QueryDto;

      await service.getMany(query);

      expect(renegotiationRepository.findSortPaginateBy).toHaveBeenCalledWith(
        {
          loanId: '1',
          contract: '0xcontract',
          lender: '0xlender',
          borrower: '0xborrower',
          party: RenegotiationParty.Lender,
          status: RenegotiationStatus.Active,
          statusIn: undefined
        },
        { skip: 25, limit: 25, sort: { by: 'expiresAt', direction: 'ASC' } }
      );
    });

    it('defaults sort to createdAt DESC when not provided', async () => {
      renegotiationRepository.findSortPaginateBy.mockResolvedValue([]);

      await service.getMany({ page: 1, limit: 10 } as RenegotiationV1QueryDto);

      expect(renegotiationRepository.findSortPaginateBy).toHaveBeenCalledWith(expect.anything(), {
        skip: 0,
        limit: 10,
        sort: { by: 'createdAt', direction: 'DESC' }
      });
    });
  });

  describe(RenegotiationV1Service.prototype.count.name, () => {
    it('delegates to repository.countBy with the same filters', async () => {
      renegotiationRepository.countBy.mockResolvedValue(7);

      const result = await service.count({
        page: 1,
        limit: 10,
        loanId: '1',
        contract: '0xcontract'
      } as RenegotiationV1QueryDto);

      expect(result).toBe(7);
      expect(renegotiationRepository.countBy).toHaveBeenCalledWith(
        expect.objectContaining({ loanId: '1', contract: '0xcontract' })
      );
    });
  });

  describe(RenegotiationV1Service.prototype.deleteById.name, () => {
    it('throws NotFound when the entity is missing', async () => {
      renegotiationRepository.findById.mockResolvedValue(null);

      await expect(service.deleteById(7, '0xlender')).rejects.toThrow(NotFoundException);
      expect(renegotiationRepository.softDeleteCancelled).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when caller is not the author', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({ id: 7, party: RenegotiationParty.Lender, lender: '0xlender' })
      );

      await expect(service.deleteById(7, '0xborrower')).rejects.toThrow(UnauthorizedException);
      expect(renegotiationRepository.softDeleteCancelled).not.toHaveBeenCalled();
    });

    it('throws Unprocessable when the entity is not Active', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xlender',
          status: RenegotiationStatus.Accepted
        })
      );

      await expect(service.deleteById(7, '0xlender')).rejects.toThrow(UnprocessableEntityException);
      expect(renegotiationRepository.softDeleteCancelled).not.toHaveBeenCalled();
    });

    it('throws Unprocessable when the entity is already soft-deleted', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xlender',
          status: RenegotiationStatus.Active,
          deletedAt: new Date('2024-01-01T00:00:00.000Z')
        })
      );

      await expect(service.deleteById(7, '0xlender')).rejects.toThrow(UnprocessableEntityException);
    });

    it('soft-deletes the entity when caller is the lender author', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xlender',
          status: RenegotiationStatus.Active
        })
      );
      renegotiationRepository.softDeleteCancelled.mockResolvedValue(1);

      await service.deleteById(7, '0xlender');

      expect(renegotiationRepository.softDeleteCancelled).toHaveBeenCalledWith(7);
    });

    it('matches caller case-insensitively', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xLENDER',
          status: RenegotiationStatus.Active
        })
      );
      renegotiationRepository.softDeleteCancelled.mockResolvedValue(1);

      await service.deleteById(7, '0xlender');

      expect(renegotiationRepository.softDeleteCancelled).toHaveBeenCalledWith(7);
    });

    it('recognises legacy borrower-party rows when checking the author', async () => {
      renegotiationRepository.findById.mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Borrower,
          borrower: '0xborrower',
          status: RenegotiationStatus.Active
        })
      );
      renegotiationRepository.softDeleteCancelled.mockResolvedValue(1);

      await service.deleteById(7, '0xborrower');

      expect(renegotiationRepository.softDeleteCancelled).toHaveBeenCalledWith(7);
    });
  });

  describe(RenegotiationV1Service.prototype.acceptByLoan.name, () => {
    it('delegates to the repository with lowercased contract', async () => {
      renegotiationRepository.acceptActiveByLoan.mockResolvedValue(2);

      await service.acceptByLoan('1', '0xCONTRACT');

      expect(renegotiationRepository.acceptActiveByLoan).toHaveBeenCalledWith('1', '0xcontract');
    });

    it('still resolves when nothing matches', async () => {
      renegotiationRepository.acceptActiveByLoan.mockResolvedValue(0);

      await expect(service.acceptByLoan('1', '0xcontract')).resolves.toBeUndefined();
    });
  });

  describe(RenegotiationV1Service.prototype.markExpired.name, () => {
    it('delegates to repository.softDeleteExpired', async () => {
      renegotiationRepository.softDeleteExpired.mockResolvedValue(3);

      await service.markExpired();

      expect(renegotiationRepository.softDeleteExpired).toHaveBeenCalledTimes(1);
    });

    it('still resolves when nothing is expired', async () => {
      renegotiationRepository.softDeleteExpired.mockResolvedValue(0);

      await expect(service.markExpired()).resolves.toBeUndefined();
    });
  });

  describe(RenegotiationV1Service.prototype.toDtos.name, () => {
    it('maps entities to DTOs with the loan loanId/contract refs', async () => {
      const entity = buildPostgresRenegotiation({
        id: 11,
        loan: buildPostgresMarketLoan({ loanId: '99', contract: '0xcontract' }),
        status: RenegotiationStatus.Active,
        party: RenegotiationParty.Lender,
        lender: '0xlender',
        lenderNonce: 'n-1',
        borrower: '0xborrower',
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        signature: '0xsig',
        message: 'hi',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });

      const [dto] = await service.toDtos([entity]);

      expect(dto).toEqual({
        id: 11,
        loan: { id: '99', contract: '0xcontract' },
        status: RenegotiationStatus.Active,
        party: RenegotiationParty.Lender,
        lender: { address: '0xlender', nonce: 'n-1' },
        borrower: { address: '0xborrower' },
        terms: {
          loan: {
            duration: 86400,
            renegotiationFee: '10000000000000000',
            expiresAt: new Date('2099-06-19T23:30:18.000Z')
          }
        },
        signature: '0xsig',
        message: 'hi',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
    });
  });
});
