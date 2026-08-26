import { INestApplication, Logger } from '@nestjs/common';
import { ClientRMQ } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { QueueFacade, QueueFacadeConfigToken } from '../src/queue';
import { EmailTemplate, SendEmailPayload } from '../src/email-notifications/email-notifications.types';
import { EmailNotificationsFacade } from '../src/email-notifications/email-notifications.facade';

describe(EmailNotificationsFacade.name, () => {
  let facade: EmailNotificationsFacade;
  let client: ClientRMQ;
  let configService: ConfigService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              rabbitmq: {
                url: 'amqp://localtest:5672'
              }
            })
          ]
        })
      ],
      providers: [
        EmailNotificationsFacade,
        {
          provide: 'EmailNotificationsFacadeToken',
          useValue: {
            emit: jest.fn(),
            send: jest.fn()
          }
        },
        {
          provide: QueueFacadeConfigToken,
          useValue: {
            urls: ['amqp://localtest:5672'],
            caller: 'test-caller'
          }
        }
      ]
    }).compile();

    facade = moduleRef.get(EmailNotificationsFacade);
    client = moduleRef.get('EmailNotificationsFacadeToken');
    configService = moduleRef.get(ConfigService);
  });

  describe(EmailNotificationsFacade.prototype.sendMessage.name, () => {
    it('emits email message payload', async () => {
      const payload: SendEmailPayload = {
        commsId: 'email-1',
        to: 'test@nftfi.com',
        subject: 'Subject',
        template: EmailTemplate.RenegotiationBorrower,
        context: {
          lender: '0xabc',
          borrower: '0xdef',
          loanId: 123,
          fee: '1',
          oldDurationDays: 1,
          newDurationDays: 2,
          dueTime: 'tomorrow',
          oldRepayment: 1,
          newRepayment: 2,
          diffRepayment: 1,
          oldApr: 10,
          newApr: 11,
          diffApr: 1,
          currency: { ticker: 'ETH' },
          assetName: 'Asset',
          assetCategory: 'Category',
          assetUrl: 'https://nftfi.com/assets/1'
        }
      };
      const fnEmit = jest.spyOn(client, 'emit').mockReturnValueOnce(of(undefined));

      await facade.sendMessage(payload);

      expect(fnEmit).toHaveBeenCalledWith('mailer_message', {
        ...payload,
        caller: 'test-caller'
      });
    });
  });

  describe(EmailNotificationsFacade.forRoot.name, () => {
    it('returns a dynamic module with correct configuration', () => {
      const dynamicModule = EmailNotificationsFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });

      expect(dynamicModule.module.name).toBe('EmailNotificationsFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(EmailNotificationsFacade.setupMicroservice.name, () => {
    it('sets up microservice with correct configuration', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      EmailNotificationsFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup.mock.calls[0][1](configService)).toEqual({ urls: ['amqp://localtest:5672'] });
      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'mailer', {});
    });
  });
});
