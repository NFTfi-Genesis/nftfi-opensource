import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  MarketLoanProtocol,
  MarketLoanRepository,
  MarketLoanStatus
} from '@nftfi.api/repositories/postgres/market-loan';
import {
  RenegotiationParty,
  RenegotiationRepository,
  RenegotiationStatus
} from '@nftfi.api/repositories/postgres/renegotiation';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { buildPostgresRenegotiation } from '@nftfi.api/repositories/postgres/factories/renegotiation';
import { httpValidationPipe } from '@nftfi.api/validation';
import { AuthService, AuthModuleConfigToken, type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { RenegotiationV1Controller, RenegotiationV1Service } from '../src/renegotiation-v1';
import {
  RenegotiationV1DurationValidationPipe,
  RenegotiationV1OfferValidationPipe
} from '../src/renegotiation-v1/pipes';

describe(RenegotiationV1Controller.name, () => {
  let app: INestApplication;
  let renegotiationRepository: RenegotiationRepository;
  let marketLoanRepository: MarketLoanRepository;
  let jwtService: JwtService;

  const lenderAuthPayload: AuthTokenPayload = {
    account: '0xlender',
    multisig: {},
    iat: 1700000000,
    exp: 1700000900
  };
  const lenderJwt = `test.${Buffer.from(JSON.stringify(lenderAuthPayload)).toString('base64')}.test`;

  const validLenderBody = {
    loan: { id: 42 },
    lender: { address: '0xlender', nonce: 'n-42' },
    terms: {
      loan: {
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: '2099-06-19T23:30:18.000Z'
      }
    },
    signature: '0xsig',
    message: 'Please extend'
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              pagination: { limit: 100, page: 1 },
              renegotiation: {
                maxDurationSeconds: 365 * 86400
              }
            })
          ]
        })
      ],
      controllers: [RenegotiationV1Controller],
      providers: [
        RenegotiationV1Service,
        RenegotiationV1DurationValidationPipe,
        RenegotiationV1OfferValidationPipe,
        AuthService,
        {
          provide: RenegotiationRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findActiveByLoanAndParty: jest.fn().mockResolvedValue(null),
            findSortPaginateBy: jest.fn(),
            countBy: jest.fn(),
            softDeleteCancelled: jest.fn(),
            softDeleteReplaced: jest.fn()
          }
        },
        {
          provide: MarketLoanRepository,
          useValue: { findById: jest.fn() }
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() }
        },
        {
          provide: AuthModuleConfigToken,
          useValue: { secret: 'test-secret' }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(httpValidationPipe);

    renegotiationRepository = moduleRef.get(RenegotiationRepository);
    marketLoanRepository = moduleRef.get(MarketLoanRepository);
    jwtService = moduleRef.get(JwtService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(RenegotiationV1Controller.prototype.handlePost.name, () => {
    it('returns 401 when Authorization header is missing', async () => {
      const response = await request(app.getHttpServer()).post('/v1/renegotiations').send(validLenderBody);
      expect(response.status).toBe(401);
    });

    it('returns 401 when JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid'));

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(401);
    });

    it('returns 422 when the loan is not an NFTfi loan', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest
        .spyOn(marketLoanRepository, 'findById')
        .mockResolvedValue(buildPostgresMarketLoan({ lender: '0xlender', protocol: MarketLoanProtocol.Gondi }));

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({ 'loan.id': ['Loan 42 is not an NFTfi loan'] });
    });

    it('returns 422 when the loan is not defaulted', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest
        .spyOn(marketLoanRepository, 'findById')
        .mockResolvedValue(buildPostgresMarketLoan({ lender: '0xlender', status: MarketLoanStatus.Active }));

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({ 'loan.id': ['Loan 42 is not defaulted'] });
    });

    it('returns 422 when duration is not positive', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send({
          ...validLenderBody,
          terms: { loan: { ...validLenderBody.terms.loan, duration: 0 } }
        });

      expect(response.status).toBe(422);
      expect(response.body.errors['terms.loan.duration']).toBeDefined();
    });

    it('returns 422 when the body is missing the lender nonce', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send({ ...validLenderBody, lender: { address: '0xlender' } });

      expect(response.status).toBe(422);
    });

    it('returns 422 when the body is missing the signature', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send({ ...validLenderBody, signature: undefined });

      expect(response.status).toBe(422);
    });

    it('returns 401 when authenticated account does not match the lender address', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send({ ...validLenderBody, lender: { address: '0xnotlender', nonce: 'n-42' } });

      expect(response.status).toBe(401);
    });

    it('returns 404 when the underlying loan does not exist', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest.spyOn(marketLoanRepository, 'findById').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual({ 'loan.id': ['Loan 42 not found'] });
    });

    it('returns 401 when the lender does not match the on-chain loan lender', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest.spyOn(marketLoanRepository, 'findById').mockResolvedValue(
        buildPostgresMarketLoan({
          borrower: '0xborrower',
          lender: '0xotherlender',
          status: MarketLoanStatus.Defaulted
        })
      );

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(401);
    });

    it('creates a lender renegotiation and returns 201 with the DTO', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      const loan = buildPostgresMarketLoan({
        id: 42,
        loanId: '1',
        contract: 'v2-3.loan.fixed',
        borrower: '0xborrower',
        lender: '0xlender',
        status: MarketLoanStatus.Defaulted,
        principal: '1000000000000000000'
      });
      jest.spyOn(marketLoanRepository, 'findById').mockResolvedValue(loan);
      const created = buildPostgresRenegotiation({
        id: 7,
        loan,
        party: RenegotiationParty.Lender,
        borrower: '0xborrower',
        lender: '0xlender',
        lenderNonce: 'n-42',
        duration: 86400,
        renegotiationFee: '10000000000000000',
        expiresAt: new Date('2099-06-19T23:30:18.000Z'),
        message: 'Please extend',
        signature: '0xsig',
        createdAt: new Date('2024-04-10T21:29:34.000Z')
      });
      jest.spyOn(renegotiationRepository, 'create').mockResolvedValue(created);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 7,
        loan: { id: '1', contract: 'v2-3.loan.fixed' },
        status: 'active',
        party: 'lender',
        lender: { address: '0xlender', nonce: 'n-42' },
        borrower: { address: '0xborrower' },
        terms: {
          loan: {
            duration: 86400,
            renegotiationFee: '10000000000000000',
            expiresAt: '2099-06-19T23:30:18.000Z'
          }
        },
        signature: '0xsig',
        message: 'Please extend',
        createdAt: '2024-04-10T21:29:34.000Z'
      });
      expect(renegotiationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RenegotiationStatus.Active,
          party: RenegotiationParty.Lender,
          borrower: '0xborrower',
          lender: '0xlender',
          lenderNonce: 'n-42',
          signature: '0xsig',
          loan: { id: 42 }
        })
      );
    });

    it('replaces a prior active lender renegotiation before inserting the new row', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      const loan = buildPostgresMarketLoan({
        id: 42,
        loanId: '1',
        contract: 'v2-3.loan.fixed',
        borrower: '0xborrower',
        lender: '0xlender',
        status: MarketLoanStatus.Defaulted,
        principal: '1000000000000000000'
      });
      jest.spyOn(marketLoanRepository, 'findById').mockResolvedValue(loan);
      jest
        .spyOn(renegotiationRepository, 'findActiveByLoanAndParty')
        .mockResolvedValue(buildPostgresRenegotiation({ id: 99, party: RenegotiationParty.Lender, loan }));
      jest.spyOn(renegotiationRepository, 'create').mockResolvedValue(buildPostgresRenegotiation({ id: 100, loan }));

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send(validLenderBody);

      expect(response.status).toBe(201);
      expect(renegotiationRepository.softDeleteReplaced).toHaveBeenCalledWith(99);
    });

    it('returns 422 when required fields are missing', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);

      const response = await request(app.getHttpServer())
        .post('/v1/renegotiations')
        .set('Authorization', `Bearer ${lenderJwt}`)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe(RenegotiationV1Controller.prototype.handleGet.name, () => {
    const buildListEntity = (overrides = {}): ReturnType<typeof buildPostgresRenegotiation> =>
      buildPostgresRenegotiation({
        id: 1,
        loan: buildPostgresMarketLoan({ loanId: '1', contract: 'v2-3.loan.fixed' }),
        ...overrides
      });

    it('returns paginated renegotiations with pagination headers', async () => {
      jest.spyOn(renegotiationRepository, 'countBy').mockResolvedValue(1);
      jest.spyOn(renegotiationRepository, 'findSortPaginateBy').mockResolvedValue([buildListEntity()]);

      const response = await request(app.getHttpServer()).get('/v1/renegotiations?loanId=1&contract=v2-3.loan.fixed');

      expect(response.status).toBe(200);
      expect(response.headers['x-pagination-total']).toBe('1');
      expect(response.headers['x-pagination-page']).toBe('1');
      expect(response.headers['x-pagination-limit']).toBe('100');
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 1, loan: { id: '1', contract: 'v2-3.loan.fixed' } });
    });

    it('passes filters, sort and pagination to the repository', async () => {
      const fnCountBy = jest.spyOn(renegotiationRepository, 'countBy').mockResolvedValue(0);
      const fnFind = jest.spyOn(renegotiationRepository, 'findSortPaginateBy').mockResolvedValue([]);

      const query = [
        'loanId=1',
        'contract=v2-3.loan.fixed',
        'lender=0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
        'borrower=0x268699101bb18d80576975584a222b5732cf56f2',
        'party=lender',
        'status=active',
        'statusIn=active,accepted',
        'sort=expiresAt',
        'direction=asc',
        'page=2',
        'limit=25'
      ].join('&');

      const response = await request(app.getHttpServer()).get(`/v1/renegotiations?${query}`);

      expect(response.status).toBe(200);
      expect(fnCountBy).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: '1',
          contract: 'v2-3.loan.fixed',
          lender: '0x80d16553493c2ff84b6f0f32b8561d39c7b3af22',
          borrower: '0x268699101bb18d80576975584a222b5732cf56f2',
          party: RenegotiationParty.Lender,
          status: RenegotiationStatus.Active,
          statusIn: [RenegotiationStatus.Active, RenegotiationStatus.Accepted]
        })
      );
      expect(fnFind).toHaveBeenCalledWith(expect.any(Object), {
        skip: 25,
        limit: 25,
        sort: { by: 'expiresAt', direction: 'ASC' }
      });
    });
  });

  describe(RenegotiationV1Controller.prototype.handleGetById.name, () => {
    it('returns 404 when not found', async () => {
      jest.spyOn(renegotiationRepository, 'findById').mockResolvedValue(null);

      const response = await request(app.getHttpServer()).get('/v1/renegotiations/7');

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual({ id: ['Renegotiation 7 not found'] });
    });

    it('returns 400 when id is not a valid integer', async () => {
      const response = await request(app.getHttpServer()).get('/v1/renegotiations/abc');

      expect(response.status).toBe(400);
    });

    it('returns the entity DTO when found', async () => {
      jest.spyOn(renegotiationRepository, 'findById').mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          loan: buildPostgresMarketLoan({ loanId: '1', contract: 'v2-3.loan.fixed' })
        })
      );

      const response = await request(app.getHttpServer()).get('/v1/renegotiations/7');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(7);
      expect(response.body.loan).toEqual({ id: '1', contract: 'v2-3.loan.fixed' });
    });
  });

  describe(RenegotiationV1Controller.prototype.handleDelete.name, () => {
    it('returns 401 when Authorization header is missing', async () => {
      const response = await request(app.getHttpServer()).delete('/v1/renegotiations/7');
      expect(response.status).toBe(401);
    });

    it('returns 401 when JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid'));

      const response = await request(app.getHttpServer())
        .delete('/v1/renegotiations/7')
        .set('Authorization', `Bearer ${lenderJwt}`);

      expect(response.status).toBe(401);
    });

    it('returns 404 when renegotiation does not exist', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest.spyOn(renegotiationRepository, 'findById').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/v1/renegotiations/7')
        .set('Authorization', `Bearer ${lenderJwt}`);

      expect(response.status).toBe(404);
    });

    it('returns 401 when caller is not the author', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest
        .spyOn(renegotiationRepository, 'findById')
        .mockResolvedValue(
          buildPostgresRenegotiation({ id: 7, party: RenegotiationParty.Lender, lender: '0xotherlender' })
        );

      const response = await request(app.getHttpServer())
        .delete('/v1/renegotiations/7')
        .set('Authorization', `Bearer ${lenderJwt}`);

      expect(response.status).toBe(401);
    });

    it('returns 422 when renegotiation is not Active', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest.spyOn(renegotiationRepository, 'findById').mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xlender',
          status: RenegotiationStatus.Accepted
        })
      );

      const response = await request(app.getHttpServer())
        .delete('/v1/renegotiations/7')
        .set('Authorization', `Bearer ${lenderJwt}`);

      expect(response.status).toBe(422);
    });

    it('soft-deletes and returns 204 when caller is the lender author', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(lenderAuthPayload);
      jest.spyOn(renegotiationRepository, 'findById').mockResolvedValue(
        buildPostgresRenegotiation({
          id: 7,
          party: RenegotiationParty.Lender,
          lender: '0xlender',
          status: RenegotiationStatus.Active
        })
      );
      const fnSoftDelete = jest.spyOn(renegotiationRepository, 'softDeleteCancelled').mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .delete('/v1/renegotiations/7')
        .set('Authorization', `Bearer ${lenderJwt}`);

      expect(response.status).toBe(204);
      expect(fnSoftDelete).toHaveBeenCalledWith(7);
    });
  });
});
