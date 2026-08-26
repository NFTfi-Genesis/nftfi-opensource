import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HealthModule } from '@nftfi.api/modules/health';
import { buildCollectionAssetEntity } from '@nftfi.api/repositories/postgres/factories/collection-asset';
import { AssetService } from '../src/asset/asset.service';
import { AssetPipe } from '../src/asset/asset.pipe';

describe(AssetPipe.name, () => {
  let pipe: AssetPipe;
  let service: AssetService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        AssetPipe,
        {
          provide: AssetService,
          useValue: {
            getByKey: jest.fn()
          }
        }
      ]
    }).compile();

    pipe = moduleRef.get(AssetPipe);
    service = moduleRef.get(AssetService);
  });

  describe(AssetPipe.prototype.transform.name, () => {
    it('should throw BadRequestException if contract or tokenId is missing', async () => {
      const fnGetAsset = jest.spyOn(service, 'getByKey').mockResolvedValue(undefined);

      const promise = pipe.transform({ contract: '', tokenId: '1' });

      await expect(promise).rejects.toThrow(BadRequestException);
      expect(fnGetAsset).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      const fnGetAsset = jest.spyOn(service, 'getByKey').mockResolvedValue(undefined);

      const promise = pipe.transform({ contract: '0x123', tokenId: '1' });

      await expect(promise).rejects.toThrow(NotFoundException);
      expect(fnGetAsset).toHaveBeenCalledWith('0x123', '1');
    });

    it('should return asset for valid contract and tokenId', async () => {
      const asset = buildCollectionAssetEntity({ contract: '0x123', tokenId: '1' });
      const fnGetAsset = jest.spyOn(service, 'getByKey').mockResolvedValue(asset);

      const result = await pipe.transform({ contract: '0x123', tokenId: '1' });

      expect(result).toEqual(asset);
      expect(fnGetAsset).toHaveBeenCalledWith('0x123', '1');
    });
  });
});
