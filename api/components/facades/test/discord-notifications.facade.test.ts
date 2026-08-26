import { INestApplication, Logger } from '@nestjs/common';
import { ClientRMQ } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { QueueFacade, QueueFacadeConfigToken } from '../src/queue';
import { DiscordMessageDto, DiscordMessageType } from '../src/discord-notifications/discord-message.dto';
import { DiscordNotificationsFacade } from '../src/discord-notifications/discord-notifications.facade';

describe(DiscordNotificationsFacade.name, () => {
  let facade: DiscordNotificationsFacade;
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
        DiscordNotificationsFacade,
        {
          provide: 'DiscordNotificationsFacadeToken',
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

    facade = moduleRef.get(DiscordNotificationsFacade);
    client = moduleRef.get('DiscordNotificationsFacadeToken');
    configService = moduleRef.get(ConfigService);
  });

  describe(DiscordNotificationsFacade.prototype.sendMessage.name, () => {
    it('emits discord message payload', async () => {
      const payload: DiscordMessageDto = {
        commsId: 'discord-1',
        type: DiscordMessageType.NewListing,
        context: {
          assetUrl: 'https://nftfi.com/assets/1',
          nftCollateralContract: '0x0000000000000000000000000000000000000001',
          nftCollateralId: '1',
          imageUrl: 'https://nftfi.com/images/1.png'
        }
      };
      const fnEmit = jest.spyOn(client, 'emit').mockReturnValueOnce(of(undefined));

      await facade.sendMessage(payload);

      expect(fnEmit).toHaveBeenCalledWith('discord_message', {
        ...payload,
        caller: 'test-caller'
      });
    });
  });

  describe(DiscordNotificationsFacade.forRoot.name, () => {
    it('returns a dynamic module with correct configuration', () => {
      const dynamicModule = DiscordNotificationsFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });

      expect(dynamicModule.module.name).toBe('DiscordNotificationsFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(DiscordNotificationsFacade.setupMicroservice.name, () => {
    it('sets up microservice with correct configuration', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      DiscordNotificationsFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup.mock.calls[0][1](configService)).toEqual({ urls: ['amqp://localtest:5672'] });
      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'discord', {});
    });
  });
});
