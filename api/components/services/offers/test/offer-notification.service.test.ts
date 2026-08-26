import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SupportedCurrencies } from '@nftfi.api/core';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { buildPostgresOffer } from '@nftfi.api/repositories/postgres/factories/offer';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { EmailNotificationsFacade } from '@nftfi.api/facades/email-notifications';
import * as cronUtils from '@nftfi.api/core/utils/cron';
import { OfferNotificationContextService, OfferNotificationService } from '../src/offer-notification';

jest.mock('@nftfi.api/core/utils/cron', () => ({
  ...jest.requireActual('@nftfi.api/core/utils/cron'),
  isCommsFrequencyMatchesNow: jest.fn()
}));

const buildAccountWithEmail = (
  overrides: { email?: string } = {}
): {
  wallet: string;
  email: string;
  username: string | null;
  socials: Record<string, never>;
  communications: {
    refi: { frequency: CommsFrequency };
    maturity: { frequency: CommsFrequency };
    liquidity: { frequency: CommsFrequency };
  };
} => ({
  wallet: '0x123',
  email: 'test@nftfi.com',
  username: null,
  socials: {},
  communications: {
    refi: { frequency: CommsFrequency.Daily },
    maturity: { frequency: CommsFrequency.Daily },
    liquidity: { frequency: CommsFrequency.Daily }
  },
  ...overrides
});

describe(OfferNotificationService.name, () => {
  let app: INestApplication;
  let service: OfferNotificationService;
  let offerRepository: OfferRepository;
  let marketLoanRepository: MarketLoanRepository;
  let accountsFacade: AccountsFacade;
  let mailerFacade: EmailNotificationsFacade;
  let contextService: OfferNotificationContextService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              dapp: {
                url: 'http://nftfi.dapp',
                api: {
                  uri: 'http://nftfi-api:3600'
                }
              }
            })
          ]
        })
      ],
      providers: [
        OfferNotificationService,
        {
          provide: OfferNotificationContextService,
          useValue: {
            getBorrowerLiquidutySummary: jest.fn(),
            getOffer: jest.fn(),
            getRefiOffer: jest.fn()
          }
        },
        {
          provide: OfferRepository,
          useValue: {
            findActiveBorrowers: jest.fn(),
            findByBorrower: jest.fn(),
            count: jest.fn()
          }
        },
        {
          provide: MarketLoanRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: AccountsFacade,
          useValue: {
            getAccountWithEmail: jest.fn()
          }
        },
        {
          provide: EmailNotificationsFacade,
          useValue: {
            sendMessage: jest.fn().mockResolvedValue(null)
          }
        },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();

    service = moduleRef.get(OfferNotificationService);
    offerRepository = moduleRef.get(OfferRepository);
    marketLoanRepository = moduleRef.get(MarketLoanRepository);
    accountsFacade = moduleRef.get(AccountsFacade);
    mailerFacade = moduleRef.get(EmailNotificationsFacade);
    contextService = moduleRef.get(OfferNotificationContextService);

    await app.init();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterAll(async () => {
    await app.close();
  });

  describe(OfferNotificationService.prototype.notifyBorrowersAboutLiquidutyOffers.name, () => {
    it('does not send emails if there are no active borrowers', async () => {
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue([]);

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(accountsFacade.getAccountWithEmail).not.toHaveBeenCalled();
      expect(offerRepository.findByBorrower).not.toHaveBeenCalled();
    });

    it('does not send emails if account with email is not found', async () => {
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue(['0x123']);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(null);

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(offerRepository.findByBorrower).not.toHaveBeenCalled();
    });

    it('does not send emails if cron does not match', async () => {
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue(['0x123']);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(buildAccountWithEmail());
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(false);

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(offerRepository.findByBorrower).not.toHaveBeenCalled();
    });

    it('does not send emails if there are no offers found', async () => {
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue(['0x123']);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(buildAccountWithEmail());
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);
      jest.spyOn(offerRepository, 'findByBorrower').mockResolvedValue([]);

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
    });

    it('sends emails with offers summary', async () => {
      const borrower = '0x123';
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue([borrower]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(buildAccountWithEmail());
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);
      jest.spyOn(offerRepository, 'findByBorrower').mockResolvedValue([buildPostgresOffer({ id: 1, borrower })]);
      jest.spyOn(contextService, 'getBorrowerLiquidutySummary').mockResolvedValue({
        borrower: '0x123',
        assetOfferGroups: [
          {
            assetName: 'test-assetName',
            assetCategory: 'test-collectionName',
            imagePreviewUrl: 'http://test-imageUrl',
            offers: [
              {
                nftKey: 'nft-key-11',
                nftCollateralContract: '0xaaa',
                nftCollateralId: '1',
                lender: '0x111',
                principal: 0.13,
                currency: {
                  ticker: 'wETH'
                },
                durationDays: 1,
                apr: 83.95,
                offerId: '11',
                repayment: 0.14
              }
            ],
            assetUrl: 'http://nftfi.dapp/assets/0x9ab/98',
            totalOffers: 1
          }
        ],
        assetUrl: 'http://nftfi.dapp/borrow/offers'
      });

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: '0x123-available-liquidity-01-01-2024170406720000000:00',
        to: 'test@nftfi.com',
        subject: 'NFTfi: Offers summary',
        template: 'offers-summary-borrower',
        context: {
          borrower: '0x123',
          assetOfferGroups: [
            {
              assetName: 'test-assetName',
              assetCategory: 'test-collectionName',
              imagePreviewUrl: 'http://test-imageUrl',
              offers: [
                {
                  nftKey: 'nft-key-11',
                  nftCollateralContract: '0xaaa',
                  nftCollateralId: '1',
                  lender: '0x111',
                  principal: 0.13,
                  currency: {
                    ticker: 'wETH'
                  },
                  durationDays: 1,
                  apr: 83.95,
                  offerId: '11',
                  repayment: 0.14
                }
              ],
              assetUrl: 'http://nftfi.dapp/assets/0x9ab/98',
              totalOffers: 1
            }
          ],
          assetUrl: 'http://nftfi.dapp/borrow/offers'
        }
      });
    });

    it('skips borrowers without offers and emails the rest', async () => {
      const borrower1 = '0x123';
      const borrower2 = '0x456';
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue([borrower1, borrower2]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(buildAccountWithEmail());
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);
      jest
        .spyOn(offerRepository, 'findByBorrower')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([buildPostgresOffer({ id: 11, borrower: borrower2 })]);
      jest.spyOn(contextService, 'getBorrowerLiquidutySummary').mockResolvedValue({
        borrower: '0x123',
        assetOfferGroups: [
          {
            assetName: 'test-assetName',
            assetCategory: 'test-collectionName',
            imagePreviewUrl: 'http://test-imageUrl',
            offers: [
              {
                nftKey: 'nft-key-11',
                nftCollateralContract: '0xaaa',
                nftCollateralId: '1',
                lender: '0x111',
                principal: 0.13,
                currency: {
                  ticker: 'wETH'
                },
                durationDays: 1,
                apr: 83.95,
                offerId: '11',
                repayment: 0.14
              }
            ],
            assetUrl: 'http://nftfi.dapp/assets/0x9ab/98',
            totalOffers: 1
          }
        ],
        assetUrl: 'http://nftfi.dapp/borrow/offers'
      });

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('suppresses notification errors', async () => {
      jest.spyOn(offerRepository, 'findActiveBorrowers').mockResolvedValue(['0x123']);
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValue(buildAccountWithEmail({ email: 'test+borrower@nftfi.com' }));
      jest
        .spyOn(offerRepository, 'findByBorrower')
        .mockResolvedValueOnce([buildPostgresOffer({ id: 11, borrower: '0x123' })]);
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      await service.notifyBorrowersAboutLiquidutyOffers();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe(OfferNotificationService.prototype.notifyBorrowerReceivedOffer.name, () => {
    it('does not send email if borrower account is not found', async () => {
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(null);

      const offer = buildPostgresOffer();
      await service.notifyBorrowerReceivedOffer(offer);

      expect(offerRepository.count).not.toHaveBeenCalled();
      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
    });

    it('does not send email if borrower has more than one active offer for this NFT', async () => {
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(buildAccountWithEmail());
      jest.spyOn(offerRepository, 'count').mockResolvedValue(2);

      const offer = buildPostgresOffer();
      await service.notifyBorrowerReceivedOffer(offer);

      expect(offerRepository.count).toHaveBeenCalledWith({
        nftContract: '0xnft',
        nftTokenIdFrom: '1',
        borrower: '0xborrower'
      });
      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
    });

    it('sends email with offer received when no active loan exists', async () => {
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValue(buildAccountWithEmail({ email: 'supoort@nftfi.com' }));
      jest.spyOn(offerRepository, 'count').mockResolvedValue(1);
      jest.spyOn(marketLoanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(contextService, 'getOffer').mockResolvedValue({
        assetCategory: 'collectionName',
        assetName: 'assetName',
        assetUrl: 'http://nftfi.dapp/assets/0xaaa/1',
        apr: 37,
        borrower: '0x555',
        lender: '0x111',
        currency: {
          ticker: 'wETH'
        },
        dueTime: '19:46 20 Jan 1970 GMT+00:00',
        durationDays: 10,
        imagePreviewUrl: 'imageUrl',
        principal: 1e-15,
        repayment: 1.001e-15
      });

      const offer = buildPostgresOffer({ id: 1 });
      const result = await service.notifyBorrowerReceivedOffer(offer);

      expect(result).toBeUndefined();
      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'offer-borrower-1',
        context: {
          apr: 37,
          assetCategory: 'collectionName',
          assetName: 'assetName',
          assetUrl: 'http://nftfi.dapp/assets/0xaaa/1',
          borrower: '0x555',
          currency: {
            ticker: 'wETH'
          },
          dueTime: '19:46 20 Jan 1970 GMT+00:00',
          durationDays: 10,
          imagePreviewUrl: 'imageUrl',
          lender: '0x111',
          principal: 1e-15,
          repayment: 1.001e-15
        },
        subject: 'NFTfi: You have received the first loan offer on a newly listed asset',
        template: 'offer-borrower',
        to: 'supoort@nftfi.com'
      });
    });

    it('sends email for refi offer when an active loan exists', async () => {
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValue(buildAccountWithEmail({ email: 'supoort@nftfi.com' }));
      jest.spyOn(offerRepository, 'count').mockResolvedValue(1);
      jest.spyOn(marketLoanRepository, 'find').mockResolvedValue([buildPostgresMarketLoan()]);
      jest.spyOn(contextService, 'getRefiOffer').mockResolvedValue({
        assetCategory: 'collectionName',
        assetName: 'assetName',
        assetUrl: 'http://nftfi.dapp/assets/0xaaa/1',
        oldApr: 37,
        newApr: 38,
        diffApr: 1,
        borrower: '0x555',
        lender: '0x111',
        currency: {
          ticker: 'wETH'
        },
        dueTime: '19:46 20 Jan 1970 GMT+00:00',
        diffRepayment: 0.001e-15,
        fee: 0.0001e-15,
        loanId: 123,
        newDurationDays: 10,
        oldDurationDays: 9,
        newRepayment: 1.001e-15,
        oldRepayment: 1.0e-15
      });

      const offer = buildPostgresOffer({ id: 1 });
      const result = await service.notifyBorrowerReceivedOffer(offer);

      expect(result).toBeUndefined();
      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'offer-refi-borrower-1',
        context: {
          assetCategory: 'collectionName',
          assetName: 'assetName',
          assetUrl: 'http://nftfi.dapp/assets/0xaaa/1',
          borrower: '0x555',
          currency: {
            ticker: 'wETH'
          },
          diffApr: 1,
          diffRepayment: 1e-18,
          dueTime: '19:46 20 Jan 1970 GMT+00:00',
          fee: 1e-19,
          lender: '0x111',
          loanId: 123,
          newApr: 38,
          newDurationDays: 10,
          newRepayment: 1.001e-15,
          oldApr: 37,
          oldDurationDays: 9,
          oldRepayment: 1e-15
        },
        subject: 'NFTfi: You have received a loan refinancing offer',
        template: 'offer-refi-borrower',
        to: 'supoort@nftfi.com'
      });
    });

    it('suppresses notification errors', async () => {
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValue(buildAccountWithEmail({ email: 'supoort@nftfi.com' }));
      jest.spyOn(offerRepository, 'count').mockResolvedValue(1);
      jest.spyOn(marketLoanRepository, 'find').mockResolvedValue([]);
      jest.spyOn(contextService, 'getOffer').mockResolvedValue({
        assetCategory: 'collectionName',
        assetName: 'assetName',
        assetUrl: 'http://nftfi.dapp/assets/0xaaa/1',
        apr: 37,
        borrower: '0x555',
        lender: '0x111',
        currency: {
          ticker: 'wETH'
        },
        dueTime: '19:46 20 Jan 1970 GMT+00:00',
        durationDays: 10,
        imagePreviewUrl: 'imageUrl',
        principal: 1e-15,
        repayment: 1.001e-15
      });
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      const offer = buildPostgresOffer();
      await service.notifyBorrowerReceivedOffer(offer);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });
});
