import { INestApplication } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { SupportedCurrencies } from '@nftfi.api/core';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';

import { LoanMetadataController, LoanMetadataService } from '../src/loan-metadata';

interface MetadataAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const LOAN_V23_FIXED_ADDRESS = '0x8252Df1d8b29057d1Afe3062bf5a64D503152BC8';

const buildSmartNftData = (loanOverrides = {}): { smartNftId: string; loan: object } => ({
  smartNftId: '12345',
  loan: buildPostgresMarketLoan(loanOverrides)
});

describe(LoanMetadataController.name, () => {
  let app: INestApplication;
  let smartNftDataRepository: { findBySmartNftId: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    smartNftDataRepository = { findBySmartNftId: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              dapp: { url: 'https://app.nftfi.com' },
              ethereum: {
                contracts: {
                  nftfi: {
                    loanV23Fixed: { address: LOAN_V23_FIXED_ADDRESS }
                  }
                }
              }
            })
          ]
        })
      ],
      controllers: [LoanMetadataController],
      providers: [
        LoanMetadataService,
        {
          provide: NftfiSmartNftIdRepository,
          useValue: smartNftDataRepository
        },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: WETH_ADDRESS,
            DAI: DAI_ADDRESS,
            USDC: USDC_ADDRESS
          })
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /loans/v2/obligation/:chainId/:smartNftId', () => {
    it('returns obligation metadata for a valid loan', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          loanId: '100',
          contract: LOAN_V23_FIXED_ADDRESS.toLowerCase(),
          principal: '1000000000000000000',
          repaymentMax: '1100000000000000000',
          duration: 7776000,
          startedAt: new Date('2023-01-01T00:00:00.000Z'),
          dueAt: new Date('2023-04-01T00:00:00.000Z'),
          nftContract: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
          nftTokenId: '1234',
          currency: WETH_ADDRESS,
          apr: 40.56
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('NFTfi Loan #100');
      expect(response.body.description).toContain('obligation receipt');
      expect(response.body.image).toContain('placeholder.png');
      expect(response.body.external_url).toBe(
        'https://app.nftfi.com/assets/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/1234'
      );
      expect(response.body.attributes).toBeDefined();
      expect(response.body.attributes.length).toBe(12);
    });

    it('returns 404 when loan not found', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(null);

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/99999');

      expect(response.status).toBe(404);
    });

    it('returns 404 when smartNftData exists but loan relation is missing', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue({ smartNftId: '12345', loan: null });

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');

      expect(response.status).toBe(404);
    });

    it('sets cache-control header', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(buildSmartNftData({ currency: WETH_ADDRESS }));

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');

      expect(response.headers['cache-control']).toBe('public, max-age=3600');
    });

    it('calls repository with correct smartNftId', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');

      expect(smartNftDataRepository.findBySmartNftId).toHaveBeenCalledWith('12345');
    });
  });

  describe('GET /loans/v2/promissory/:chainId/:smartNftId', () => {
    it('returns promissory metadata for a valid loan', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ loanId: '100', currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/promissory/1/12345');

      expect(response.status).toBe(200);
      expect(response.body.description).toContain('promissory note');
      expect(response.body.description).not.toContain('obligation receipt');
    });

    it('returns 404 when loan not found', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(null);

      const response = await request(app.getHttpServer()).get('/loans/v2/promissory/1/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('attributes', () => {
    it('formats WETH amounts correctly', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '1000000000000000000',
          repaymentMax: '1100000000000000000',
          currency: WETH_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const attributes = response.body.attributes;

      const amountBorrowed = attributes.find((a: MetadataAttribute) => a.trait_type === 'Amount Borrowed');
      expect(amountBorrowed.value).toBe('1 WETH');

      const amountRepaid = attributes.find((a: MetadataAttribute) => a.trait_type === 'Amount Repaid');
      expect(amountRepaid.value).toBe('1.1 WETH');
    });

    it('formats USDC amounts correctly', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '1000000000',
          repaymentMax: '1100000000',
          currency: USDC_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const attributes = response.body.attributes;

      const amountBorrowed = attributes.find((a: MetadataAttribute) => a.trait_type === 'Amount Borrowed');
      expect(amountBorrowed.value).toBe('1,000 USDC');

      const amountRepaid = attributes.find((a: MetadataAttribute) => a.trait_type === 'Amount Repaid');
      expect(amountRepaid.value).toBe('1,100 USDC');
    });

    it('uses APR directly from loan record', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ apr: 40.56, currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const aprAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'APR');

      expect(aprAttr.value).toBe('~41%');
    });

    it('formats duration correctly', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ duration: 7776000, currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const durationAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'Duration');

      expect(durationAttr.value).toBe('90 days');
    });

    it('uses display_type date for date attributes', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          startedAt: new Date('2023-01-01T00:00:00.000Z'),
          dueAt: new Date('2023-04-01T00:00:00.000Z'),
          currency: WETH_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const dateInitiated = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'Date Initiated');
      const dateRepayment = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Date of Repayment'
      );

      expect(dateInitiated.display_type).toBe('date');
      expect(dateInitiated.value).toBe(new Date('2023-01-01T00:00:00.000Z').getTime());
      expect(dateRepayment.display_type).toBe('date');
      expect(dateRepayment.value).toBe(new Date('2023-04-01T00:00:00.000Z').getTime());
    });

    it('resolves contract name from address', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ contract: LOAN_V23_FIXED_ADDRESS.toLowerCase(), currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const contractNameAttr = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Loan Contract Name'
      );

      expect(contractNameAttr.value).toBe('v2-3.loan.fixed');
    });

    it('derives loan key from contract name and loanId', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ loanId: '100', contract: LOAN_V23_FIXED_ADDRESS.toLowerCase(), currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const loanKeyAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'Loan Key');

      expect(loanKeyAttr.value).toBe('v2-3.loan.fixed-100');
    });

    it('shows contract address from loan record', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ contract: LOAN_V23_FIXED_ADDRESS.toLowerCase(), currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const contractAddr = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Loan Contract Address'
      );

      expect(contractAddr.value).toBe(LOAN_V23_FIXED_ADDRESS.toLowerCase());
    });
  });

  describe('edge cases', () => {
    it('returns Unknown contract name for unrecognized address', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ contract: '0xunknowncontractaddress', currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const contractNameAttr = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Loan Contract Name'
      );
      const loanKeyAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'Loan Key');

      expect(contractNameAttr.value).toBe('Unknown');
      expect(loanKeyAttr.value).toMatch(/^Unknown-/);
    });

    it('clamps negative APR to zero', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({ apr: -5.5, currency: WETH_ADDRESS })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const aprAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'APR');

      expect(aprAttr.value).toBe('~0%');
    });

    it('returns APR of ~0% for zero APR', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(buildSmartNftData({ apr: 0, currency: WETH_ADDRESS }));

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const aprAttr = response.body.attributes.find((a: MetadataAttribute) => a.trait_type === 'APR');

      expect(aprAttr.value).toBe('~0%');
    });

    it('formats very small amounts as "< 0.001"', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '100000000000000',
          repaymentMax: '200000000000000',
          currency: WETH_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const amountBorrowed = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Amount Borrowed'
      );

      expect(amountBorrowed.value).toBe('< 0.001 WETH');
    });

    it('formats large amounts with compact notation', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '150000000000000',
          repaymentMax: '160000000000000',
          currency: USDC_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const amountBorrowed = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Amount Borrowed'
      );

      expect(amountBorrowed.value).toBe('150M USDC');
    });

    it('formats 100K-999K amounts with compact notation and 2 decimals', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '500000000000',
          repaymentMax: '550000000000',
          currency: USDC_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const amountBorrowed = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Amount Borrowed'
      );

      expect(amountBorrowed.value).toBe('500K USDC');
    });

    it('formats 1M-99M amounts with compact notation and 1 decimal', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '25500000000000',
          repaymentMax: '26000000000000',
          currency: USDC_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const amountBorrowed = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Amount Borrowed'
      );

      expect(amountBorrowed.value).toBe('25.5M USDC');
    });

    it('formats extremely large amounts as "> 1000T"', async () => {
      smartNftDataRepository.findBySmartNftId.mockResolvedValue(
        buildSmartNftData({
          principal: '1000000000000000000000',
          repaymentMax: '1100000000000000000000',
          currency: USDC_ADDRESS
        })
      );

      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/1/12345');
      const amountBorrowed = response.body.attributes.find(
        (a: MetadataAttribute) => a.trait_type === 'Amount Borrowed'
      );

      expect(amountBorrowed.value).toBe('> 1000T USDC');
    });
  });

  describe('image endpoints', () => {
    it('redirects obligation image to static URL', async () => {
      const response = await request(app.getHttpServer()).get('/loans/v2/obligation/image/1/12345');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('placeholder.png');
    });

    it('redirects promissory image to static URL', async () => {
      const response = await request(app.getHttpServer()).get('/loans/v2/promissory/image/1/12345');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('placeholder.png');
    });
  });
});
