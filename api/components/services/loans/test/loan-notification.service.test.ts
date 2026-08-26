import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailNotificationsFacade } from '@nftfi.api/facades/email-notifications';
import { DiscordNotificationsFacade } from '@nftfi.api/facades/discord-notifications';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { CommsFrequency } from '@nftfi.api/repositories/postgres/account';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import * as cronUtils from '@nftfi.api/core/utils/cron';
import { LoanNotificationService } from '../src/loan-notification';
import { LoanNotificationContextService } from '../src/loan-notification/loan-notification-context.service';

jest.mock('@nftfi.api/core/utils/cron', () => ({
  ...jest.requireActual('@nftfi.api/core/utils/cron'),
  isCommsFrequencyMatchesNow: jest.fn()
}));

describe(LoanNotificationService.name, () => {
  let app: INestApplication;
  let service: LoanNotificationService;
  let contextService: LoanNotificationContextService;
  let loanRepository: MarketLoanRepository;
  let accountsFacade: AccountsFacade;
  let mailerFacade: EmailNotificationsFacade;
  let discordFacade: DiscordNotificationsFacade;

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
                api: {
                  uri: 'http://nftfi-api:3600'
                }
              },
              nfts: {
                ignored: [{ address: '0x576fe471011F1130342342e1bd539Df6408d8Fd6'.toLowerCase(), tokenId: '107' }]
              }
            })
          ]
        })
      ],
      providers: [
        LoanNotificationService,
        {
          provide: MarketLoanRepository,
          useValue: {
            setConfig: jest.fn(),
            findByKey: jest.fn(),
            findMaturing: jest.fn(),
            findMaturingByLender: jest.fn(),
            findDistinctWalletsByKey: jest.fn()
          }
        },
        {
          provide: AccountsFacade,
          useValue: { getAccountWithEmail: jest.fn() }
        },
        {
          provide: LoanNotificationContextService,
          useValue: {
            getLoanIsAlmostDue: jest.fn(),
            getLoanStarted: jest.fn(),
            getLoanRepaid: jest.fn(),
            getLoanRepaidBorrower: jest.fn(),
            getLoanRepaidLender: jest.fn(),
            getLoanLiquidated: jest.fn(),
            getLoanRenegotiated: jest.fn(),
            getLoansMaturityContext: jest.fn(),
            getLoansMaturityByBorrowerContext: jest.fn()
          }
        },
        { provide: EmailNotificationsFacade, useValue: { sendMessage: jest.fn().mockResolvedValue(null) } },
        { provide: DiscordNotificationsFacade, useValue: { sendMessage: jest.fn().mockResolvedValue(null) } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    service = app.get(LoanNotificationService);
    contextService = app.get(LoanNotificationContextService);
    loanRepository = app.get(MarketLoanRepository);
    accountsFacade = app.get(AccountsFacade);
    mailerFacade = app.get(EmailNotificationsFacade);
    discordFacade = app.get(DiscordNotificationsFacade);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(LoanNotificationService.prototype.notifyLoansMaturityByBorrower.name, () => {
    it('can notify borrower about almost due loans using emails', async () => {
      jest
        .spyOn(loanRepository, 'findMaturing')
        .mockResolvedValue([buildPostgresMarketLoan({ borrower: '0x123', id: 789, loanId: '789' })]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'test+borrower@nftfi.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      jest.spyOn(contextService, 'getLoansMaturityByBorrowerContext').mockResolvedValue({
        assetUrl: 'http://nftfi.com/asset/asset-id',
        dueTime: '3:12 PM Friday 25th November 2024 GMT',
        repayment: 110,
        currency: {
          ticker: 'DAI'
        },
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        apr: 0,
        principal: 100,
        durationDays: 30,
        assetCategory: 'test-category',
        assetName: 'test-asset'
      });

      await service.notifyLoansMaturityByBorrower();

      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loans-maturity-by-borrower:0x123-789',
        context: {
          apr: 0,
          assetCategory: 'test-category',
          assetName: 'test-asset',
          assetUrl: 'http://nftfi.com/asset/asset-id',
          borrower: '0x123',
          currency: {
            ticker: 'DAI'
          },
          dueTime: '3:12 PM Friday 25th November 2024 GMT',
          durationDays: 30,
          lender: '0x456',
          loanId: '789',
          principal: 100,
          repayment: 110
        },
        subject: 'NFTfi: Loan repayment is due soon',
        template: 'loans-maturity-by-borrower',
        to: 'test+borrower@nftfi.com'
      });
    });

    it('should supress notification errors', async () => {
      jest
        .spyOn(loanRepository, 'findMaturing')
        .mockResolvedValue([buildPostgresMarketLoan({ borrower: '0x123', id: 789, loanId: '789' })]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'test+borrower@nftfi.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      jest.spyOn(contextService, 'getLoansMaturityByBorrowerContext').mockResolvedValue({
        assetUrl: 'http://nftfi.com/asset/asset-id',
        dueTime: '3:12 PM Friday 25th November 2024 GMT',
        repayment: 110,
        currency: {
          ticker: 'DAI'
        },
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        apr: 0,
        principal: 100,
        durationDays: 30,
        assetCategory: 'test-category',
        assetName: 'test-asset'
      });
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      await service.notifyLoansMaturityByBorrower();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('skips when borrower account is missing', async () => {
      jest
        .spyOn(loanRepository, 'findMaturing')
        .mockResolvedValue([buildPostgresMarketLoan({ borrower: '0x123', id: 789, loanId: '789' })]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(null);
      jest.spyOn(contextService, 'getLoansMaturityByBorrowerContext').mockResolvedValue({
        assetUrl: 'http://nftfi.com/asset/asset-id',
        dueTime: '3:12 PM Friday 25th November 2024 GMT',
        repayment: 110,
        currency: {
          ticker: 'DAI'
        },
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        apr: 0,
        principal: 100,
        durationDays: 30,
        assetCategory: 'test-category',
        assetName: 'test-asset'
      });
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      await service.notifyLoansMaturityByBorrower();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(0);
    });
  });

  describe(LoanNotificationService.prototype.notifyLoansMaturityByLender.name, () => {
    it('sends a list of maturing loans by lender', async () => {
      jest.spyOn(loanRepository, 'findMaturing').mockResolvedValue([
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '100000000000000000',
          repayment: '110000000000000000'
        }),
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '600000000000000000',
          repayment: '660000000000000000'
        })
      ]);

      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'user1@nftfi-user.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Weekly },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      jest.spyOn(contextService, 'getLoansMaturityContext').mockResolvedValue({
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
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.1,
            repayment: 0.11
          },
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
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.6,
            repayment: 0.66
          }
        ]
      });
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);

      await service.notifyLoansMaturityByLender();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loans-maturity-by-lender:0x123-2024-01-01',
        context: {
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
              lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
              principal: 0.1,
              repayment: 0.11
            },
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
              lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
              principal: 0.6,
              repayment: 0.66
            }
          ]
        },
        subject: 'NFTfi: Your Loans Are Approaching Maturity',
        template: 'loans-maturity-by-lender',
        to: 'user1@nftfi-user.com'
      });
    });

    it('uses daily frequency when none is set', async () => {
      jest.spyOn(loanRepository, 'findMaturing').mockResolvedValue([
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '100000000000000000',
          repayment: '110000000000000000'
        }),
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '600000000000000000',
          repayment: '660000000000000000'
        })
      ]);

      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'user1@nftfi-user.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      jest.spyOn(contextService, 'getLoansMaturityContext').mockResolvedValue({
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
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.1,
            repayment: 0.11
          },
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
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.6,
            repayment: 0.66
          }
        ]
      });
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);

      await service.notifyLoansMaturityByLender();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(cronUtils.isCommsFrequencyMatchesNow).toHaveBeenCalledWith('daily');
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loans-maturity-by-lender:0x123-2024-01-01',
        context: {
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
              lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
              principal: 0.1,
              repayment: 0.11
            },
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
              lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
              principal: 0.6,
              repayment: 0.66
            }
          ]
        },
        subject: 'NFTfi: Your Loans Are Approaching Maturity',
        template: 'loans-maturity-by-lender',
        to: 'user1@nftfi-user.com'
      });
    });

    it('skips when lender account is missing', async () => {
      jest.spyOn(loanRepository, 'findMaturing').mockResolvedValue([
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844'
        })
      ]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue(null);

      await service.notifyLoansMaturityByLender();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
    });

    it('skips when comms frequency does not match', async () => {
      jest.spyOn(loanRepository, 'findMaturing').mockResolvedValue([
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844'
        })
      ]);
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'user1@nftfi-user.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Weekly },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(false);

      await service.notifyLoansMaturityByLender();

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(cronUtils.isCommsFrequencyMatchesNow).toHaveBeenCalledWith('weekly');
    });

    it('should supress notification errors', async () => {
      jest.spyOn(loanRepository, 'findMaturing').mockResolvedValue([
        buildPostgresMarketLoan({
          lender: '0x123',
          currency: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
          principal: '100000000000000000',
          repayment: '110000000000000000'
        })
      ]);

      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'user1@nftfi-user.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });
      jest.spyOn(contextService, 'getLoansMaturityContext').mockResolvedValue({
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
            lender: '0x053dd3e4d764f487f16e7bf2247b14eb4c1c667d',
            principal: 0.1,
            repayment: 0.11
          }
        ]
      });
      (cronUtils.isCommsFrequencyMatchesNow as jest.Mock).mockReturnValue(true);
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      await service.notifyLoansMaturityByLender();

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe(LoanNotificationService.prototype.notifyLoanStarted.name, () => {
    it('can notify borrower with loan started emails and discord for borrower', async () => {
      jest.spyOn(contextService, 'getLoanStarted').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: { ticker: 'DAI' },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        assetUrlCallback: 'http://example.com/nftfi/callback',
        borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
        lender: '0x456',
        durationDays: 30,
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'test+borrower@example.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        dueAt: new Date('2024-11-25T15:12:54.000Z')
      });

      await service.notifyLoanStarted('loan-started', loan);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-started',
        to: 'test+borrower@example.com',
        subject: 'NFTfi: Your loan has started',
        template: 'loan-started-borrower',
        attachments: [
          {
            description:
              'test-asset is currently held in escrow in a NFTfi contract and will be released back to you if a repayment amount of 110 DAI is made before 3:12 PM, 25 November 2024 (GMT+0)',
            end: new Date('2024-11-25T15:12:54.000Z'),
            start: new Date('2024-11-25T14:12:54.000Z'),
            title: 'NFTfi loan repayment on test-asset is due',
            type: 'ics'
          }
        ],
        context: {
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi',
          assetUrlCallback: 'http://example.com/nftfi/callback',
          borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
          lender: '0x456',
          loanId: '789',
          principal: 100,
          repayment: 110
        }
      });
      expect(discordFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-started',
        context: {
          loanId: '789',
          borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
          lender: '0x456',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi',
          assetUrlCallback: 'http://example.com/nftfi/callback'
        },
        type: 'loan-started'
      });
    });

    it('builds ics description even when optional context fields are missing', async () => {
      jest.spyOn(contextService, 'getLoanStarted').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
        lender: '0x456',
        durationDays: 30,
        loanId: '789',
        principal: 100,
        repayment: 110,
        currency: { ticker: 'DAI' },
        assetUrlCallback: '?cb=12345'
      });
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValue({
        wallet: '0x123',
        email: 'test+borrower@example.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        dueAt: new Date('2024-11-25T15:12:54.000Z')
      });

      await service.notifyLoanStarted('loan-started', loan);

      const call = (mailerFacade.sendMessage as jest.Mock).mock.calls[0][0];
      expect(call.attachments[0].description).toContain('repayment amount of');
    });

    it('can notify loan started without discord if nfts are ignored', async () => {
      jest.spyOn(contextService, 'getLoanStarted').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: { ticker: 'DAI' },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '107',
        assetUrl: 'http://example.com/nftfi',
        assetUrlCallback: 'http://example.com/nftfi/callback',
        borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
        lender: '0x456',
        durationDays: 30,
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValueOnce({
        wallet: '0x123',
        email: 'test+borrower@example.com',
        username: null,
        socials: {},
        communications: {
          refi: { frequency: CommsFrequency.Daily },
          maturity: { frequency: CommsFrequency.Daily },
          liquidity: { frequency: CommsFrequency.Daily }
        }
      });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6'.toLowerCase(),
        nftTokenId: '107',
        dueAt: new Date('2024-11-25T15:12:54.000Z')
      });

      await service.notifyLoanStarted('loan-started', loan);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-started',
        to: 'test+borrower@example.com',
        subject: 'NFTfi: Your loan has started',
        template: 'loan-started-borrower',
        attachments: [
          {
            description:
              'test-asset is currently held in escrow in a NFTfi contract and will be released back to you if a repayment amount of 110 DAI is made before 3:12 PM, 25 November 2024 (GMT+0)',
            end: new Date('2024-11-25T15:12:54.000Z'),
            start: new Date('2024-11-25T14:12:54.000Z'),
            title: 'NFTfi loan repayment on test-asset is due',
            type: 'ics'
          }
        ],
        context: {
          assetUrl: 'http://example.com/nftfi',
          assetUrlCallback: 'http://example.com/nftfi/callback',
          borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
          lender: '0x456',
          loanId: '789',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '107'
        }
      });
      expect(discordFacade.sendMessage).not.toHaveBeenCalled();
    });

    it('should supress notification errors', async () => {
      jest.spyOn(contextService, 'getLoanStarted').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: { ticker: 'DAI' },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        assetUrlCallback: 'http://example.com/nftfi/callback',
        borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
        lender: '0x456',
        durationDays: 30,
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValue({
          wallet: '0x123',
          email: 'test+borrower@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValue({
          wallet: '0x456',
          email: 'test+lender@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));
      jest.spyOn(discordFacade, 'sendMessage').mockRejectedValue(new Error('Discord error'));

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        dueAt: new Date('2024-11-25T15:12:54.000Z')
      });

      await service.notifyLoanStarted('loan-started', loan);
      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('skips borrower email when borrower account is missing', async () => {
      jest.spyOn(contextService, 'getLoanStarted').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: { ticker: 'DAI' },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        assetUrlCallback: 'http://example.com/nftfi/callback',
        borrower: '0x97B0E8F8D766Eb6e70B84287f52e6e8F260CE9E5',
        lender: '0x456',
        durationDays: 30,
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108',
        dueAt: new Date('2024-11-25T15:12:54.000Z')
      });

      await service.notifyLoanStarted('loan-started', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(1);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          commsId: 'loan-started',
          to: 'test+lender@example.com',
          template: 'loan-started-lender'
        })
      );
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe(LoanNotificationService.prototype.notifyLoanRepaid.name, () => {
    it('can notify both parties with loan repaid emails and discord', async () => {
      jest.spyOn(contextService, 'getLoanRepaidBorrower').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        loanId: '789'
      });
      jest.spyOn(contextService, 'getLoanRepaidLender').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        adminFee: '0.1',
        amountPaidToLender: '0.1',
        currency: {
          ticker: 'DAI'
        },
        assetUrl: 'http://example.com/nftfi',
        lender: '0x456',
        loanId: '789',
        borrower: '0x123'
      });
      jest.spyOn(contextService, 'getLoanRepaid').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        assetUrl: 'http://example.com/nftfi',
        durationDays: 30,
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        principal: '100000000000000000',
        repayment: '100000000000000000',
        adminFee: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanRepaid('loan-repaid', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-repaid',
        subject: 'NFTfi: Your loan has been repaid',
        template: 'loan-repaid-borrower',
        to: 'test+borrower@example.com',
        context: {
          loanId: '789',
          borrower: '0x123',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          assetUrl: 'http://example.com/nftfi'
        }
      });
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-repaid',
        subject: 'NFTfi: Your loan has been repaid',
        template: 'loan-repaid-lender',
        to: 'test+lender@example.com',
        context: {
          adminFee: '0.1',
          amountPaidToLender: '0.1',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          borrower: '0x123',
          currency: {
            ticker: 'DAI'
          },
          lender: '0x456',
          loanId: '789',
          assetUrl: 'http://example.com/nftfi'
        }
      });
      expect(discordFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-repaid',
        context: {
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi'
        },
        type: 'loan-repaid'
      });
    });

    it('should supress notification errors', async () => {
      jest.spyOn(contextService, 'getLoanRepaidBorrower').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        loanId: '789'
      });
      jest.spyOn(contextService, 'getLoanRepaidLender').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        adminFee: '0.1',
        amountPaidToLender: '0.1',
        currency: {
          ticker: 'DAI'
        },
        assetUrl: 'http://example.com/nftfi',
        lender: '0x456',
        loanId: '789',
        borrower: '0x123'
      });
      jest.spyOn(contextService, 'getLoanRepaid').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        assetUrl: 'http://example.com/nftfi',
        durationDays: 30,
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@example.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));
      jest.spyOn(discordFacade, 'sendMessage').mockRejectedValue(new Error('Discord error'));

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        principal: '100000000000000000',
        repayment: '100000000000000000',
        adminFee: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanRepaid('loan-repaid', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('skips borrower and lender emails when accounts are missing but still sends discord', async () => {
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      jest.spyOn(contextService, 'getLoanRepaid').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        assetUrl: 'http://example.com/nftfi',
        durationDays: 30,
        principal: 100,
        repayment: 110
      });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        currency: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        principal: '100000000000000000',
        repayment: '100000000000000000',
        adminFee: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanRepaid('loan-repaid', loan);

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe(LoanNotificationService.prototype.notifyLoanLiquidated.name, () => {
    it('can notify both parties with loan liquidated emails and discord', async () => {
      jest.spyOn(contextService, 'getLoanLiquidated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        durationDays: 30,
        lender: '0x456',
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        principal: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanLiquidated('loan-liquidated', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-liquidated',
        subject: 'NFTfi: Loan foreclosed',
        template: 'loan-liquidated-borrower',
        to: 'test+borrower@nftfi.com',
        context: {
          lender: '0x456',
          loanId: '789',
          borrower: '0x123',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi'
        }
      });
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-liquidated',
        subject: 'NFTfi: Loan foreclosed',
        template: 'loan-liquidated-lender',
        to: 'test+lender@nftfi.com',
        context: {
          lender: '0x456',
          loanId: '789',
          borrower: '0x123',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi'
        }
      });

      expect(discordFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-liquidated',
        context: {
          lender: '0x456',
          loanId: '789',
          borrower: '0x123',
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          imagePreviewUrl: 'http://example.com/image.jpg',
          durationDays: 30,
          principal: 100,
          repayment: 110,
          nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
          nftCollateralId: '108',
          assetUrl: 'http://example.com/nftfi'
        },
        type: 'loan-liquidated'
      });
    });

    it('should supress notification errors', async () => {
      jest.spyOn(contextService, 'getLoanLiquidated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        durationDays: 30,
        lender: '0x456',
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });
      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));
      jest.spyOn(discordFacade, 'sendMessage').mockRejectedValue(new Error('Discord error'));

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        principal: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanLiquidated('loan-liquidated', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('skips borrower and lender emails when accounts are missing but still sends discord', async () => {
      jest.spyOn(contextService, 'getLoanLiquidated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        imagePreviewUrl: 'http://example.com/image.jpg',
        nftCollateralContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftCollateralId: '108',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        durationDays: 30,
        lender: '0x456',
        loanId: '789',
        principal: 100,
        repayment: 110
      });
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        principal: '100000000000000000',
        nftContract: '0x576fe471011F1130342342e1bd539Df6408d8Fd6',
        nftTokenId: '108'
      });

      await service.notifyLoanLiquidated('loan-liquidated', loan);

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
      expect(discordFacade.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe(LoanNotificationService.prototype.notifyLoanRenegotiated.name, () => {
    it('can notify both parties with loan renegotiated emails', async () => {
      jest.spyOn(contextService, 'getLoanRenegotiated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        renegotiationFee: '0.1',
        loanDueTime: '03:12 PM Friday 25th November 2024 GMT',
        newMaximumRepaymentAmount: '110',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        lender: '0x456',
        loanId: '789'
      });
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue(buildPostgresMarketLoan({}));
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        repayment: '100000000000000000'
      });

      await service.notifyLoanRenegotiated('loan-renegotiated', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-renegotiated-borrower',
        subject: 'NFTfi: Your loan has been renegotiated',
        template: 'loan-renegotiated-borrower',
        to: 'test+borrower@nftfi.com',
        context: {
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          borrower: '0x123',
          lender: '0x456',
          loanId: '789',
          loanDueTime: '03:12 PM Friday 25th November 2024 GMT',
          newMaximumRepaymentAmount: '110',
          assetUrl: 'http://example.com/nftfi',
          renegotiationFee: '0.1'
        }
      });

      expect(mailerFacade.sendMessage).toHaveBeenCalledWith({
        commsId: 'loan-renegotiated-lender',
        subject: 'NFTfi: Your loan has been renegotiated',
        template: 'loan-renegotiated-lender',
        to: 'test+lender@nftfi.com',
        context: {
          assetCategory: 'test-category',
          assetName: 'test-asset',
          currency: {
            ticker: 'DAI'
          },
          borrower: '0x123',
          lender: '0x456',
          loanId: '789',
          loanDueTime: '03:12 PM Friday 25th November 2024 GMT',
          newMaximumRepaymentAmount: '110',
          assetUrl: 'http://example.com/nftfi',
          renegotiationFee: '0.1'
        }
      });
    });

    it('should supress notification errors', async () => {
      jest.spyOn(contextService, 'getLoanRenegotiated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        renegotiationFee: '0.1',
        loanDueTime: '03:12 PM Friday 25th November 2024 GMT',
        newMaximumRepaymentAmount: '110',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        lender: '0x456',
        loanId: '789'
      });
      jest.spyOn(loanRepository, 'findByKey').mockResolvedValue(buildPostgresMarketLoan({}));
      jest
        .spyOn(accountsFacade, 'getAccountWithEmail')
        .mockResolvedValueOnce({
          wallet: '0x123',
          email: 'test+borrower@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        })
        .mockResolvedValueOnce({
          wallet: '0x456',
          email: 'test+lender@nftfi.com',
          username: null,
          socials: {},
          communications: {
            refi: { frequency: CommsFrequency.Daily },
            maturity: { frequency: CommsFrequency.Daily },
            liquidity: { frequency: CommsFrequency.Daily }
          }
        });

      jest.spyOn(mailerFacade, 'sendMessage').mockRejectedValue(new Error('Mailer error'));

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        repayment: '100000000000000000'
      });

      await service.notifyLoanRenegotiated('loan-renegotiated', loan);

      expect(mailerFacade.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('skips borrower and lender emails when accounts are missing', async () => {
      jest.spyOn(contextService, 'getLoanRenegotiated').mockResolvedValue({
        assetName: 'test-asset',
        assetCategory: 'test-category',
        currency: {
          ticker: 'DAI'
        },
        renegotiationFee: '0.1',
        loanDueTime: '03:12 PM Friday 25th November 2024 GMT',
        newMaximumRepaymentAmount: '110',
        assetUrl: 'http://example.com/nftfi',
        borrower: '0x123',
        lender: '0x456',
        loanId: '789'
      });
      jest.spyOn(accountsFacade, 'getAccountWithEmail').mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const loan = buildPostgresMarketLoan({
        id: 789,
        loanId: '789',
        borrower: '0x123',
        lender: '0x456',
        repayment: '100000000000000000'
      });

      await service.notifyLoanRenegotiated('loan-renegotiated', loan);

      expect(mailerFacade.sendMessage).not.toHaveBeenCalled();
    });
  });
});
