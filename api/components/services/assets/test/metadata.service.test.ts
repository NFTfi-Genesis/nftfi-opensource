import fs from 'fs/promises';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { File } from '@google-cloud/storage';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { MetadataService } from '../src/metadata.service';
import { MediaProcessorService } from '../src/media-processor.service';
import { ContentType } from '../src/metadata.types';

describe(MetadataService.name, () => {
  let service: MetadataService;
  let objectStorageFacade: GcpStorageFacade;
  let mediaService: MediaProcessorService;
  let cacheManager: Cache<RedisStore>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    objectStorageFacade = { upload: jest.fn() } as unknown as GcpStorageFacade;
    mediaService = { loadAndResize: jest.fn() } as unknown as MediaProcessorService;
    cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as unknown as Cache<RedisStore>;

    service = new MetadataService(
      {
        baseDir: '/tmp',
        bucket: 'gs://test-bucket'
      },
      mediaService,
      objectStorageFacade,
      cacheManager
    );

    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  describe(MetadataService.prototype['verifyUrl'].name, () => {
    it('should return false for an invalid URL', async () => {
      const result = await service['verifyUrl']('invalid-url');
      expect(result).toBe(false);
    });

    it('returns false for empty URL', async () => {
      const result = await service['verifyUrl']('');
      expect(result).toBe(false);
    });

    it('tries to get the URL with HEAD request', async () => {
      const fnHead = jest.spyOn(axios, 'head').mockResolvedValue({
        headers: { 'content-type': 'image/png' }
      });

      const result = await service['verifyUrl']('https://example.com/resource');
      expect(result).toBe(true);
      expect(fnHead).toHaveBeenCalledWith('https://example.com/resource', expect.any(Object));
    });

    it('tries to get the URL with GET request if HEAD fails', async () => {
      const fnHead = jest.spyOn(axios, 'head').mockRejectedValue(new Error('HEAD request failed'));
      const fnGet = jest.spyOn(axios, 'get').mockResolvedValue({
        headers: { 'content-type': 'image/png' }
      });

      const result = await service['verifyUrl']('https://example.com/resource');
      expect(result).toBe(true);
      expect(fnHead).toHaveBeenCalledWith('https://example.com/resource', expect.any(Object));
      expect(fnGet).toHaveBeenCalledWith('https://example.com/resource', expect.any(Object));
    });

    it('returns false if both HEAD and GET requests fail', async () => {
      const fnHead = jest.spyOn(axios, 'head').mockRejectedValue(new Error('HEAD request failed'));
      const fnGet = jest.spyOn(axios, 'get').mockRejectedValue(new Error('GET request failed'));

      const result = await service['verifyUrl']('https://example.com/resource');
      expect(result).toBe(false);
      expect(fnHead).toHaveBeenCalledWith('https://example.com/resource', expect.any(Object));
      expect(fnGet).toHaveBeenCalledWith('https://example.com/resource', expect.any(Object));
    });
  });

  describe(MetadataService.prototype['getRawToken'].name, () => {
    it('returns null if url is not valid', async () => {
      const result = await service['getRawToken'](null);
      expect(result).toBeNull();
    });

    it('returns image url if it is part of a valid json object', async () => {
      const fnFetch = jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: {
          image: 'https://example.com/image.png',
          contentType: 'image/png'
        },
        headers: { 'content-type': 'application/json' }
      });

      const result = await service['getRawToken']('https://example.com/token.json');

      expect(result).toEqual('https://example.com/image.png');
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/token.json', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        },
        httpsAgent: expect.any(Object)
      });
    });

    it('returns image url if it is part of a valid raw metadata string', async () => {
      const fnFetch = jest.spyOn(axios, 'get').mockResolvedValue({
        data: '{ \t"image": "https://example.com/image.png" }',
        headers: { 'content-type': 'application/text' }
      });

      const result = await service['getRawToken']('https://example.com/token.json');

      expect(result).toEqual('https://example.com/image.png');
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/token.json', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        },
        httpsAgent: expect.any(Object)
      });
    });

    it('returns null if no image found in raw metadata', async () => {
      const fnFetch = jest.spyOn(axios, 'get').mockResolvedValue({
        data: '{ "name": "Test Token" }',
        headers: { 'content-type': 'application/json' }
      });

      const result = await service['getRawToken']('https://example.com/token.json');

      expect(result).toBeNull();
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/token.json', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        },
        httpsAgent: expect.any(Object)
      });
    });

    it('returns null if fetch fails', async () => {
      const fnFetch = jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

      const result = await service['getRawToken']('https://example.com/token.json');

      expect(result).toBeNull();
      expect(fnFetch).toHaveBeenCalledWith('https://example.com/token.json', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        },
        httpsAgent: expect.any(Object)
      });
    });
  });

  describe(MetadataService.prototype.getContentType.name, () => {
    it('returns the content type from the headers', async () => {
      const result = await service.getContentType('https://example.com/image.png', 'image/png');

      expect(result).toBe('image/png');
    });

    it('returns PNG for .png file', async () => {
      const result = await service.getContentType('https://example.com/image.png');
      expect(result).toBe('image/png');
    });

    it('returns JPEG for .jpg file', async () => {
      const result = await service.getContentType('https://example.com/image.jpg');
      expect(result).toBe('image/jpeg');
    });

    it('returns GIF for .gif file', async () => {
      const result = await service.getContentType('https://example.com/image.gif');
      expect(result).toBe('image/gif');
    });

    it('fetches content type from headers if not provided', async () => {
      const fnHead = jest.spyOn(axios, 'head').mockResolvedValue({
        headers: { 'content-type': 'image/png' }
      });

      const result = await service.getContentType('https://example.com/image');

      expect(result).toBe('image/png');
      expect(fnHead).toHaveBeenCalledWith('https://example.com/image', {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
        }
      });
    });

    it('fetches content type from headers and maps shorthand types', async () => {
      jest.spyOn(axios, 'head').mockResolvedValue({ headers: { 'content-type': 'jpeg' } });

      const result = await service.getContentType('https://example.com/image');

      expect(result).toBe('image/jpeg');
    });

    it('returns raw content type when header type is unknown', async () => {
      jest.spyOn(axios, 'head').mockResolvedValue({ headers: { 'content-type': 'application/octet-stream' } });

      const result = await service.getContentType('https://example.com/file');

      expect(result).toBe('application/octet-stream');
    });
  });

  describe(MetadataService.prototype.isLinkValid.name, () => {
    it('validates url empty', async () => {
      const result = await service.isLinkValid('');

      expect(result).toBe(false);
    });

    it('validates url malformed', async () => {
      const result = await service.isLinkValid("'http:\\example.com/invalid-url',");

      expect(result).toBe(false);
    });

    it('validates and refreshes links if cannot access image', async () => {
      jest.spyOn(axios, 'head').mockRejectedValue(new Error('Network error'));

      const result = await service.isLinkValid('http://example.com/unreachable-small.jpg');

      expect(result).toEqual(false);
    });

    it('validates content type unsupported', async () => {
      jest.spyOn(axios, 'head').mockResolvedValue({ headers: { 'content-type': 'text/plain' } });

      const result = await service.isLinkValid('http://example.com/unsupported.txt');

      expect(result).toEqual(false);
    });

    it('true if all checks passed', async () => {
      jest.spyOn(axios, 'head').mockResolvedValue({ headers: { 'content-type': 'image/png' } });

      const result = await service.isLinkValid('http://example.com/valid-image.png');

      expect(result).toEqual(true);
    });
  });

  describe(MetadataService.prototype['sanitizeUrl'].name, () => {
    it('resolves ipfs:// URLs', () => {
      const result = service['sanitizeUrl']('ipfs://QmTzQ1');
      expect(result).toBe('https://ipfs.io/ipfs/QmTzQ1');
    });
  });

  describe(MetadataService.prototype.getStorageUrls.name, () => {
    it('generates storage urls for multiple image sizes', async () => {
      const fnRm = jest.spyOn(fs, 'rm').mockResolvedValue(null);
      const fnResize = jest.spyOn(mediaService, 'loadAndResize').mockResolvedValue('/tmp/resized-image.jpg');
      const fnUpload = jest
        .spyOn(objectStorageFacade, 'upload')
        .mockResolvedValueOnce([
          ,
          {
            publicUrl: jest
              .fn()
              .mockReturnValue('http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg')
          } as unknown as File
        ])
        .mockResolvedValueOnce([
          ,
          {
            publicUrl: jest
              .fn()
              .mockReturnValue('http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg')
          } as unknown as File
        ]);

      const result = await service.getStorageUrls(
        { url: 'https://example.com/image.png', contentType: ContentType.PNG },
        '0x123-1',
        [
          { width: 100, height: 100, name: 'small' },
          { width: 200, height: 200, name: 'large' }
        ]
      );
      jest.runOnlyPendingTimers();

      expect(result).toEqual([
        'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/small.jpeg',
        'http://object.storage/0x1234567890abcdef1234567890abcdef12345678-123/medium.jpeg'
      ]);
      expect(fnRm).toHaveBeenCalledWith('/tmp/0x123-1', { recursive: true });
      expect(fnUpload).toHaveBeenNthCalledWith(1, 'gs://test-bucket/0x123-1', '/tmp/resized-image.jpg');
      expect(fnUpload).toHaveBeenNthCalledWith(2, 'gs://test-bucket/0x123-1', '/tmp/resized-image.jpg');
      expect(fnResize).toHaveBeenNthCalledWith(
        1,
        'https://example.com/image.png',
        'image/png',
        {
          maxHeight: 100,
          maxWidth: 100
        },
        '/tmp/0x123-1/small'
      );
      expect(fnResize).toHaveBeenNthCalledWith(
        2,
        'https://example.com/image.png',
        'image/png',
        {
          maxHeight: 200,
          maxWidth: 200
        },
        '/tmp/0x123-1/large'
      );
    });

    it('throws if content type is unsupported', async () => {
      const promise = service.getStorageUrls(
        { url: 'https://example.com/image.bmp', contentType: 'image/bmp' as ContentType },
        '0x123-1',
        [{ width: 100, height: 100, name: 'small' }]
      );

      await expect(promise).rejects.toThrow('Unsupported content type image/bmp for 0x123-1');
    });

    it('cleans up output folder and rethrows when upload fails', async () => {
      const fnRm = jest.spyOn(fs, 'rm').mockResolvedValue(null);
      jest.spyOn(mediaService, 'loadAndResize').mockResolvedValue('/tmp/resized-image.jpg');
      jest.spyOn(objectStorageFacade, 'upload').mockRejectedValue(new Error('Upload failed'));

      const promise = service.getStorageUrls(
        { url: 'https://example.com/image.png', contentType: ContentType.PNG },
        '0x123-1',
        [{ width: 100, height: 100, name: 'small' }]
      );

      await expect(promise).rejects.toThrow('Upload failed');
      jest.runOnlyPendingTimers();

      expect(fnRm).toHaveBeenCalledWith('/tmp/0x123-1', { recursive: true });
    });
  });

  describe(MetadataService.prototype['resolveNullableImageWithFibonacciBackoff'].name, () => {
    it('returns unresolved value and schedules retry when resolver throws', async () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const resolve = jest.fn().mockRejectedValue(new Error('resolver failed'));

      const result = await service['resolveNullableImageWithFibonacciBackoff']({
        cacheKey: 'assets:missing-image:0x123:1',
        resolve,
        isResolved: value => Boolean(value),
        unresolvedValue: null,
        placeholderValue: 'https://placeholder.test/image.png'
      });

      expect(result).toBeNull();
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'assets:missing-image:0x123:1',
        {
          failedAttempts: 1,
          nextAttemptAt: new Date('2026-01-02T00:00:00.000Z').getTime()
        },
        expect.any(Number)
      );
    });

    it('schedules the first retry after one day when unresolved', async () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const resolve = jest.fn().mockResolvedValue(null);

      const result = await service['resolveNullableImageWithFibonacciBackoff']({
        cacheKey: 'assets:missing-image:0x123:1',
        resolve,
        isResolved: value => Boolean(value),
        unresolvedValue: null,
        placeholderValue: 'https://placeholder.test/image.png'
      });

      expect(result).toBeNull();
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'assets:missing-image:0x123:1',
        {
          failedAttempts: 1,
          nextAttemptAt: new Date('2026-01-02T00:00:00.000Z').getTime()
        },
        expect.any(Number)
      );
    });

    it('skips resolving when next retry time is in the future', async () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      jest.spyOn(cacheManager, 'get').mockResolvedValue({
        failedAttempts: 2,
        nextAttemptAt: new Date('2026-01-02T00:00:00.000Z').getTime()
      });
      const resolve = jest.fn().mockResolvedValue('https://example.com/image.png');

      const result = await service['resolveNullableImageWithFibonacciBackoff']({
        cacheKey: 'collections:missing-image:0x123:1',
        resolve,
        isResolved: value => Boolean(value),
        unresolvedValue: null,
        placeholderValue: 'https://placeholder.test/image.png'
      });

      expect(result).toBeNull();
      expect(resolve).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('returns placeholder and clears cache after max failed attempts', async () => {
      jest.setSystemTime(new Date('2026-01-20T00:00:00.000Z'));
      jest.spyOn(cacheManager, 'get').mockResolvedValue({
        failedAttempts: 5,
        nextAttemptAt: new Date('2026-01-19T00:00:00.000Z').getTime()
      });
      const resolve = jest.fn().mockResolvedValue(null);

      const result = await service['resolveNullableImageWithFibonacciBackoff']({
        cacheKey: 'collections:missing-image:0x123:1',
        resolve,
        isResolved: value => Boolean(value),
        unresolvedValue: null,
        placeholderValue: 'https://placeholder.test/image.png'
      });

      expect(result).toEqual('https://placeholder.test/image.png');
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).toHaveBeenCalledWith('collections:missing-image:0x123:1');
    });

    it('throws if cache manager does not expose required methods', async () => {
      const serviceWithInvalidCache = new MetadataService(
        { baseDir: '/tmp', bucket: 'gs://test-bucket' },
        mediaService,
        objectStorageFacade,
        {} as Cache<RedisStore>
      );
      const resolve = jest.fn().mockResolvedValue(null);

      await expect(
        serviceWithInvalidCache['resolveNullableImageWithFibonacciBackoff']({
          cacheKey: 'assets:missing-image:0xabc:2',
          resolve,
          isResolved: value => Boolean(value),
          unresolvedValue: null,
          placeholderValue: 'https://placeholder.test/image.png'
        })
      ).rejects.toThrow(/get is not a function/);
    });

    it('propagates error when cache get throws while loading retry state', async () => {
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('cache unavailable'));
      const resolve = jest.fn().mockResolvedValue(null);

      await expect(
        service['resolveNullableImageWithFibonacciBackoff']({
          cacheKey: 'assets:missing-image:0xabc:3',
          resolve,
          isResolved: value => Boolean(value),
          unresolvedValue: null,
          placeholderValue: 'https://placeholder.test/image.png'
        })
      ).rejects.toThrow('cache unavailable');
      expect(resolve).not.toHaveBeenCalled();
    });

    it('clears retry cache and returns result when image resolves', async () => {
      const resolvedValue = { imageSmallUrl: 'https://example.com/s.jpg' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue({
        failedAttempts: 1,
        nextAttemptAt: new Date('2025-12-31T00:00:00.000Z').getTime()
      });
      const resolve = jest.fn().mockResolvedValue(resolvedValue);

      const result = await service['resolveNullableImageWithFibonacciBackoff']({
        cacheKey: 'assets:missing-image:0xabc:4',
        resolve,
        isResolved: value => Boolean(value?.imageSmallUrl),
        unresolvedValue: null,
        placeholderValue: { imageSmallUrl: 'https://placeholder.test/image.png' }
      });

      expect(result).toEqual(resolvedValue);
      expect(cacheManager.del).toHaveBeenCalledWith('assets:missing-image:0xabc:4');
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe(MetadataService.prototype['tryResolveWithTimeout'].name, () => {
    it('resolves with fallback when timeout is reached', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const promise = service['tryResolveWithTimeout'](() => new Promise<string>(() => {}), 'fallback', 1000);

      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toEqual('fallback');
      expect(warnSpy).toHaveBeenCalledWith('Failed to resolve a promise, timed out after 1000ms');
    });

    it('resolves with result when promise succeeds before timeout', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const result = await service['tryResolveWithTimeout'](() => Promise.resolve('ok'), 'fallback', 1000);

      expect(result).toEqual('ok');
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('logs warning when promise rejects before timeout', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const result = await service['tryResolveWithTimeout'](
        () => Promise.reject(new Error('boom')),
        'fallback',
        10_000
      );

      expect(result).toEqual('fallback');
      expect(warnSpy).toHaveBeenCalledWith('Failed to resolve a promise: boom');
    });
  });
});
