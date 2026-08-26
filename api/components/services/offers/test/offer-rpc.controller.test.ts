import { Test } from '@nestjs/testing';
import { OfferRpcController, OfferV1Service } from '../src/offer-v1';

describe(OfferRpcController.name, () => {
  let controller: OfferRpcController;
  let service: jest.Mocked<Pick<OfferV1Service, 'deleteWinningOffer' | 'invalidateCache'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    service = {
      deleteWinningOffer: jest.fn().mockResolvedValue(undefined),
      invalidateCache: jest.fn().mockResolvedValue(undefined)
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OfferRpcController],
      providers: [{ provide: OfferV1Service, useValue: service }]
    }).compile();

    controller = moduleRef.get(OfferRpcController);
  });

  describe(OfferRpcController.prototype.onDeleteWinningOffer.name, () => {
    it('delegates the payload to the v1 service', async () => {
      await controller.onDeleteWinningOffer({
        lender: '0xlender',
        nftContract: '0xnft',
        nftTokenId: '42',
        currency: '0xerc20',
        principal: '100',
        repaymentMax: '110',
        duration: 86400
      });

      expect(service.deleteWinningOffer).toHaveBeenCalledWith({
        lender: '0xlender',
        nftContract: '0xnft',
        nftTokenId: '42',
        currency: '0xerc20',
        principal: '100',
        repaymentMax: '110',
        duration: 86400
      });
    });
  });

  describe(OfferRpcController.prototype.onInvalidateCache.name, () => {
    it('delegates to the v1 service', async () => {
      await controller.onInvalidateCache();

      expect(service.invalidateCache).toHaveBeenCalledTimes(1);
    });
  });
});
