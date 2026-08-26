import { Test } from '@nestjs/testing';
import { getEthersToken } from 'nestjs-ethers';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Block, StaticJsonRpcProvider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { EthersFacade } from '../../src/ethers-provider';

describe(EthersFacade.name, () => {
  let facade: EthersFacade;
  let cacheManager: Cache;
  let provider: StaticJsonRpcProvider;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EthersFacade,
        { provide: CACHE_MANAGER, useValue: { store: { get: jest.fn(), set: jest.fn() } } },
        {
          provide: getEthersToken(),
          useValue: {
            getBlock: jest.fn(),
            getTransaction: jest.fn(),
            getTransactionReceipt: jest.fn(),
            getNetwork: jest.fn()
          }
        }
      ]
    }).compile();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());

    facade = moduleRef.get(EthersFacade);
    cacheManager = moduleRef.get(CACHE_MANAGER);
    provider = moduleRef.get(getEthersToken());
  });

  describe(EthersFacade.prototype.getChainId.name, () => {
    it('returns cached chain id if present', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(1);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetNetwork = jest.spyOn(provider, 'getNetwork').mockResolvedValue(null);

      const chainId = await facade.getChainId();

      expect(chainId).toBe(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:chain-id');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetNetwork).not.toHaveBeenCalled();
    });

    it('fetches chain id from provider if not cached', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetNetwork = jest.spyOn(provider, 'getNetwork').mockResolvedValue({ chainId: 1, name: 'homestead' });

      const chainId = await facade.getChainId();

      expect(chainId).toBe(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:chain-id');
      expect(fnSetCache).toHaveBeenCalledWith('ethers-provider:chain-id', 1, 604800000);
      expect(fnGetNetwork).toHaveBeenCalled();
    });
  });

  describe(EthersFacade.prototype.getLatestBlock.name, () => {
    it('returns cached block if present', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1 });
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(provider, 'getBlock').mockResolvedValue(null);

      const block = await facade.getLatestBlock();

      expect(block.number).toBe(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:latest-block');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetBlock).not.toHaveBeenCalled();
    });

    it('fetches block from provider if not cached', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(provider, 'getBlock').mockResolvedValue({ number: 2 } as Block);

      const block = await facade.getLatestBlock();

      expect(block.number).toBe(2);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:latest-block');
      expect(fnSetCache).toHaveBeenCalledWith('ethers-provider:latest-block', { number: 2 }, 5000);
      expect(fnGetBlock).toHaveBeenCalledWith('latest');
    });

    it('retries fetching block if it fails', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(provider, 'getBlock').mockRejectedValue(new Error('Network error'));

      await expect(facade.getLatestBlock()).rejects.toThrow('Network error');
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:latest-block');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetBlock).toHaveBeenCalledWith('latest');
    });
  });

  describe(EthersFacade.prototype.getBlock.name, () => {
    it('returns cached block if present', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1 });
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(provider, 'getBlock').mockResolvedValue(null);

      const block = await facade.getBlock(1);

      expect(block.number).toBe(1);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:block:1');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetBlock).not.toHaveBeenCalled();
    });

    it('fetches block from provider if not cached', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetBlock = jest.spyOn(provider, 'getBlock').mockResolvedValue({ number: 2 } as Block);

      const block = await facade.getBlock(1);

      expect(block.number).toBe(2);
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:block:1');
      expect(fnSetCache).toHaveBeenCalledWith('ethers-provider:block:1', { number: 2 }, 604800000);
      expect(fnGetBlock).toHaveBeenCalledWith(1);
    });
  });

  describe(EthersFacade.prototype.getTransaction.name, () => {
    it('returns cached transaction if present', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ hash: '0x123' });
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetTransaction = jest.spyOn(provider, 'getTransaction').mockResolvedValue(null);

      const transaction = await facade.getTransaction('0x123');

      expect(transaction.hash).toBe('0x123');
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:transaction:0x123');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetTransaction).not.toHaveBeenCalled();
    });

    it('fetches transaction from provider if not cached', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetTransaction = jest
        .spyOn(provider, 'getTransaction')
        .mockResolvedValue({ hash: '0x456' } as TransactionResponse);

      const transaction = await facade.getTransaction('0x123');

      expect(transaction.hash).toBe('0x456');
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:transaction:0x123');
      expect(fnSetCache).toHaveBeenCalledWith('ethers-provider:transaction:0x123', { hash: '0x456' }, 604800000);
      expect(fnGetTransaction).toHaveBeenCalledWith('0x123');
    });
  });

  describe(EthersFacade.prototype.getTransactionReceipt.name, () => {
    it('returns cached transaction receipt if present', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ blockHash: '0x123' });
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetTransactionReceipt = jest.spyOn(provider, 'getTransactionReceipt').mockResolvedValue(null);

      const transactionReceipt = await facade.getTransactionReceipt('0x123');

      expect(transactionReceipt.blockHash).toBe('0x123');
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:transaction-receipt:0x123');
      expect(fnSetCache).not.toHaveBeenCalled();
      expect(fnGetTransactionReceipt).not.toHaveBeenCalled();
    });

    it('fetches transaction receipt from provider if not cached', async () => {
      const fnGetCache = jest.spyOn(cacheManager.store, 'get').mockResolvedValue(null);
      const fnSetCache = jest.spyOn(cacheManager.store, 'set').mockResolvedValue(null);
      const fnGetTransactionReceipt = jest
        .spyOn(provider, 'getTransactionReceipt')
        .mockResolvedValue({ blockHash: '0x456' } as TransactionReceipt);

      const transactionReceipt = await facade.getTransactionReceipt('0x123');

      expect(transactionReceipt.blockHash).toBe('0x456');
      expect(fnGetCache).toHaveBeenCalledWith('ethers-provider:transaction-receipt:0x123');
      expect(fnSetCache).toHaveBeenCalledWith(
        'ethers-provider:transaction-receipt:0x123',
        { blockHash: '0x456' },
        604800000
      );
      expect(fnGetTransactionReceipt).toHaveBeenCalledWith('0x123');
    });
  });

  describe(EthersFacade.prototype.isWithinBlockRange.name, () => {
    it('returns true when target block is within range', async () => {
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1000 });

      const result = await facade.isWithinBlockRange(995, 10);

      expect(result).toBe(true);
    });

    it('returns true when target block is exactly at range boundary', async () => {
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1000 });

      const result = await facade.isWithinBlockRange(990, 10);

      expect(result).toBe(true);
    });

    it('returns false when target block is outside range', async () => {
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1000 });

      const result = await facade.isWithinBlockRange(500, 10);

      expect(result).toBe(false);
    });

    it('returns true when target block is ahead of latest within range', async () => {
      jest.spyOn(cacheManager.store, 'get').mockResolvedValue({ number: 1000 });

      const result = await facade.isWithinBlockRange(1005, 10);

      expect(result).toBe(true);
    });
  });

  describe(EthersFacade.prototype['retry'].name, () => {
    it('retries the function if it fails', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue('success');

      const result = await facade['retry'](fn, 2);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws an error if max retries are reached', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(facade['retry'](fn, 2)).rejects.toThrow('Network error');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
