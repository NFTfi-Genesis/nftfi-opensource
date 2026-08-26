import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientRMQ } from '@nestjs/microservices';
import { QueueFacade, QueueFacadeConfigToken } from '@nftfi.api/facades/queue';
import { OffersFacade, OffersQueueTopic } from '../src/offers';

describe(OffersFacade.name, () => {
  let facade: OffersFacade;
  let client: ClientRMQ;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OffersFacade,
        {
          provide: 'OffersFacadeToken',
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

    facade = moduleRef.get(OffersFacade);
    client = moduleRef.get('OffersFacadeToken');
  });

  describe(OffersFacade.prototype.deleteWinningOffer.name, () => {
    it('emits delete-winning-offer event with payload and caller', async () => {
      const fnEmit = jest.spyOn(client, 'emit').mockReturnValueOnce(of(undefined));

      await facade.deleteWinningOffer({
        lender: '0xlender',
        nftContract: '0xnft',
        nftTokenId: '42',
        currency: '0xerc20',
        principal: '100',
        repaymentMax: '110',
        duration: 86400
      });

      expect(fnEmit).toHaveBeenCalledWith(OffersQueueTopic.DeleteWinningOffer, {
        lender: '0xlender',
        nftContract: '0xnft',
        nftTokenId: '42',
        currency: '0xerc20',
        principal: '100',
        repaymentMax: '110',
        duration: 86400,
        caller: 'test-caller'
      });
    });
  });

  describe(OffersFacade.forRoot.name, () => {
    it('returns a dynamic module with offers queue config', () => {
      const dynamicModule = OffersFacade.forRoot({
        configCallback: () => ({ urls: ['amqp://localtest:5672'] }),
        caller: 'test-caller'
      });

      expect(dynamicModule.module.name).toBe('OffersFacadeModule');
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe(OffersFacade.setupMicroservice.name, () => {
    it('configures microservice setup for offers queue', () => {
      const app = {
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;
      const fnSetup = jest.spyOn(QueueFacade, 'setupMicroservice').mockReturnValueOnce();

      OffersFacade.setupMicroservice(app, () => ({ urls: ['amqp://localtest:5672'] }));

      expect(fnSetup).toHaveBeenCalledWith(app, expect.any(Function), 'offers', {});
    });
  });
});
