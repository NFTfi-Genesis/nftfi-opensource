import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SupportedCurrencies } from '@nftfi.api/core';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { buildAssetDto } from '@nftfi.api/services/assets/factories';
import { LoanNotificationContextService } from '../src/loan-notification';

describe(LoanNotificationContextService.name, () => {
  let app: INestApplication;
  let service: LoanNotificationContextService;
  let assetQueueFacade: AssetsFacade;

  beforeEach(async () => {
    jest.resetAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              dapp: {
                url: 'http://nftfi-api:3600',
                api: {
                  uri: 'http://nftfi-api:3600'
                }
              },
              supportedCurrencies: new SupportedCurrencies({
                WETH: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
                USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
              })
            })
          ]
        })
      ],
      providers: [
        LoanNotificationContextService,
        {
          provide: AssetsFacade,
          useValue: {
            getAssetByKey: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    service = app.get(LoanNotificationContextService);
    assetQueueFacade = app.get(AssetsFacade);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(LoanNotificationContextService.prototype.getLoansMaturityByBorrowerContext.name, () => {
    it('should return the correct context', async () => {
      const loan = buildPostgresMarketLoan({
        loanId: '67',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        principal: '100000000000000000',
        repayment: '110000000000000000',
        apr: 12.000388888888889,
        duration: 7776000,
        dueAt: new Date('2023-01-15T16:32:36.000Z'),
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '810187'
      });

      const result = await service.getLoansMaturityByBorrowerContext(loan);

      expect(result).toEqual({
        apr: 12.000388888888889,
        assetCategory: '',
        assetName: '',
        assetUrl: 'http://nftfi-api:3600/assets/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b/810187',
        borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
        currency: {
          ticker: 'DAI'
        },
        dueTime: '16:32 15 Jan 2023 GMT+00:00',
        durationDays: 90,
        imagePreviewUrl: '',
        lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
        loanId: '67',
        principal: 0.1,
        repayment: 0.12
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoansMaturityContext.name, () => {
    it('should return the correct context', async () => {
      const loans = [
        buildPostgresMarketLoan({
          loanId: '67',
          borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
          lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '100000000000000000',
          repayment: '110000000000000000',
          apr: 12.000388888888889,
          duration: 7776000,
          dueAt: new Date('2023-01-15T16:32:36.000Z'),
          nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
          nftTokenId: '810187'
        })
      ];

      const result = await service.getLoansMaturityContext('0x123', loans);

      expect(result).toEqual({
        account: '0x123',
        entries: [
          {
            apr: 12.000388888888889,
            assetCategory: '',
            assetName: '',
            assetUrl: 'http://nftfi-api:3600/assets/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b/810187',
            borrower: '0x8a32121d737ce9c7b7b6e17cc7f10d7c2d5f8adc',
            currency: {
              ticker: 'DAI'
            },
            dueTime: '16:32 15 Jan 2023 GMT+00:00',
            durationDays: 90,
            imagePreviewUrl: '',
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.1,
            repayment: 0.12
          }
        ]
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanStarted.name, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(
        buildAssetDto({
          contract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
          tokenId: '108',
          imageMediumUrl: 'http://nftfi-api:3600/assets/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b/810187/image'
        })
      );
      const loan = buildPostgresMarketLoan({
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        principal: '100000000000000000',
        repayment: '100384000000000000',
        duration: 1209600,
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });
      const result = await service.getLoanStarted(loan);

      expect(result).toEqual({
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        assetCategory: 'Test Collection',
        assetName: 'Test Asset',
        currency: {
          ticker: 'wETH'
        },
        imagePreviewUrl: 'http://nftfi-api:3600/assets/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b/810187/image',
        durationDays: 14,
        principal: 0.1,
        repayment: 0.12,
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108',
        assetUrlCallback: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108?cal=open'
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanRepaid.name, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(null);
      const loan = buildPostgresMarketLoan({
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        principal: '100000000000000000',
        repayment: '1029590000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        duration: 7776000
      });
      const result = await service.getLoanRepaid(loan);

      expect(result).toEqual({
        assetCategory: '',
        assetName: '',
        currency: {
          ticker: 'USDC'
        },
        imagePreviewUrl: '',
        durationDays: 90,
        principal: 0.1,
        repayment: 0.11,
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108'
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanRepaidBorrower.name, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());
      const loan = buildPostgresMarketLoan({
        loanId: '789',
        borrower: '0x123',
        currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });
      const result = await service.getLoanRepaidBorrower(loan);

      expect(result).toEqual({
        loanId: '789',
        assetCategory: 'Test Collection',
        assetName: 'Test Asset',
        borrower: '0x123',
        imagePreviewUrl: 'https://example.com/medium.png',
        assetUrl: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108'
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanRepaidLender.name, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());
      const loan = buildPostgresMarketLoan({
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        adminFee: '100000000000000000',
        repayment: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });
      const result = await service.getLoanRepaidLender(loan);

      expect(result).toEqual({
        assetCategory: 'Test Collection',
        assetName: 'Test Asset',
        adminFee: '100000000000.0',
        amountPaidToLender: '100000000000.0',
        currency: {
          ticker: 'USDC'
        },
        imagePreviewUrl: 'https://example.com/medium.png',
        assetUrl: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108',
        borrower: '0x123',
        lender: '0x456',
        loanId: '789'
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanLiquidated.name, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());
      const loan = buildPostgresMarketLoan({
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        principal: '100000000000000000',
        repayment: '1029590000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        duration: 7776000
      });
      const result = await service.getLoanLiquidated(loan);

      expect(result).toEqual({
        borrower: '0x123',
        lender: '0x456',
        loanId: '789',
        assetCategory: 'Test Collection',
        assetName: 'Test Asset',
        assetUrl: 'http://nftfi-api:3600/assets/0x576fe471011F1130342342e1bd539Df6408d8Fd6/108',
        currency: {
          ticker: 'USDC'
        },
        imagePreviewUrl: 'https://example.com/medium.png',
        durationDays: 90,
        principal: 0.1,
        repayment: 0.12,
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108'
      });
    });
  });

  describe(LoanNotificationContextService.prototype.getLoanRenegotiated, () => {
    it('should return the correct context', async () => {
      jest.spyOn(assetQueueFacade, 'getAssetByKey').mockResolvedValue(buildAssetDto());
      const loan = buildPostgresMarketLoan({
        loanId: '67',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        repayment: '100000000000000000',
        adminFee: '100000000000000000',
        duration: 7776000,
        dueAt: new Date('2023-01-15T16:32:36.000Z'),
        nftContract: '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b',
        nftTokenId: '810187'
      });
      const result = await service.getLoanRenegotiated(loan);

      expect(result).toEqual({
        assetUrl: 'http://nftfi-api:3600/assets/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b/810187',
        borrower: '0x123',
        lender: '0x456',
        loanDueTime: '16:32 15 Jan 2023 GMT+00:00',
        loanId: '67',
        assetCategory: 'Test Collection',
        assetName: 'Test Asset',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'https://example.com/medium.png',
        newMaximumRepaymentAmount: '0.1',
        renegotiationFee: '0.1'
      });
    });
  });
});
