import { Test } from '@nestjs/testing';
import { RenegotiationV1RpcController, RenegotiationV1Service } from '../src/renegotiation-v1';

describe(RenegotiationV1RpcController.name, () => {
  let controller: RenegotiationV1RpcController;
  let service: jest.Mocked<Pick<RenegotiationV1Service, 'acceptByLoan'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    service = { acceptByLoan: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      controllers: [RenegotiationV1RpcController],
      providers: [{ provide: RenegotiationV1Service, useValue: service }]
    }).compile();

    controller = moduleRef.get(RenegotiationV1RpcController);
  });

  describe(RenegotiationV1RpcController.prototype.onAcceptRenegotiation.name, () => {
    it('delegates the payload to the v1 service', async () => {
      await controller.onAcceptRenegotiation({ loanId: '99', contract: '0xcontract' });

      expect(service.acceptByLoan).toHaveBeenCalledWith('99', '0xcontract');
    });
  });
});
