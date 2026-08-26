import https from 'https';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { addDays } from 'date-fns';
import { isNil, isNumber } from 'lodash';
import { Logger } from '@nestjs/common';
import { isURL } from 'class-validator';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { BROWSERISH_HEADERS, ContentShorthandType, ContentTypeToExtension } from './metadata.constants';
import { ContentType, ImageMetadata } from './metadata.types';
import { MediaProcessorService } from './media-processor.service';

interface MissingImageRetryState {
  failedAttempts: number;
  nextAttemptAt: number;
}

const RESOLVE_TTL = 10 * 1000 * 60 * 60 * 24; // 10 days
const FIBONACCI_RETRY_DAYS = [1, 2, 3, 5];

export class MetadataService {
  protected readonly logger = new Logger(MetadataService.name);

  constructor(
    private readonly config: { baseDir: string; bucket: string },
    private readonly mediaProcessorService: MediaProcessorService,
    private readonly objectStorageFacade: GcpStorageFacade,
    private readonly cacheManager: Cache<RedisStore>
  ) {}

  async isLinkValid(url: string | null): Promise<boolean> {
    try {
      if (!url) return false;

      if (!isURL(url, { require_protocol: true })) {
        this.logger.warn(`Image link "${url}" is not a valid URL`);
        return false;
      }
      const { headers } = await axios.head(url, { headers: BROWSERISH_HEADERS });
      const contentType = headers['content-type'] as ContentType;
      if (!ContentTypeToExtension.has(contentType)) {
        const contentTypesStr = Array.from(ContentTypeToExtension.keys()).join(', ');
        this.logger.warn(
          `Image link "${url}" has unsupported content type ${contentType}, expected one of ${contentTypesStr}`
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`Image link "${url}" is invalid: ${(error as Error).message}`);
      return false;
    }
  }

  async getStorageUrls(
    image: ImageMetadata,
    dirname: string,
    sizes: { width: number; height: number; name: string }[]
  ): Promise<string[]> {
    if (!ContentTypeToExtension.has(image.contentType)) {
      throw new Error(`Unsupported content type ${image.contentType} for ${dirname}`);
    }

    const output = path.join(this.config.baseDir, dirname);
    await fs.mkdir(output, { recursive: true });

    const bucket = new URL(path.join(dirname), this.config.bucket).toString();
    const urls: string[] = [];
    try {
      for (const size of sizes) {
        const sizepath = await this.mediaProcessorService.loadAndResize(
          image.url,
          image.contentType,
          { maxWidth: size.width, maxHeight: size.height },
          path.join(output, size.name)
        );
        const [, upload] = await this.objectStorageFacade.upload(bucket, sizepath);
        urls.push(upload.publicUrl());
      }

      setImmediate(() => fs.rm(output, { recursive: true }));

      return urls;
    } catch (error) {
      setImmediate(() => fs.rm(output, { recursive: true }));
      this.logger.error(`Failed to process and upload image for ${dirname}: ${error.message}\n${error.stack}`);

      throw error;
    }
  }

  protected async getRawToken(tokenUri: string, field = 'image'): Promise<string> {
    const sanitizedUrl = this.sanitizeUrl(tokenUri);
    if (!sanitizedUrl) return null;
    try {
      const { data, headers } = await axios.get(sanitizedUrl, {
        headers: BROWSERISH_HEADERS,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });

      const contentType = headers['content-type'] as string;
      if (contentType.startsWith('application/json')) {
        return this.sanitizeUrl(data[field]);
      }

      const rawTokenImageUrl = this.extractValueFromRawMetadata(String(data), field);
      return this.sanitizeUrl(rawTokenImageUrl);
    } catch {
      return null;
    }
  }

  private extractValueFromRawMetadata(metadataStr: string, key: string): string | null {
    // Strip tabs/newlines for easier matching
    const compact = metadataStr.replace(/[\n\r\t]/g, '');

    // Escape key in case it has special regex chars
    const keyEscaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Regex to capture value of "<key>": "<value>"
    const regex = new RegExp(`"${keyEscaped}"\\s*:\\s*"([^"]+)"`, 'i');

    const match = compact.match(regex);
    return match ? match[1] : null;
  }

  async getContentType(url: string, contentType?: string): Promise<ContentType> {
    if (ContentTypeToExtension.has(contentType as ContentType)) {
      return contentType as ContentType;
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('.png')) return ContentType.PNG;
    if (parsedUrl.pathname.endsWith('.jpg') || parsedUrl.pathname.endsWith('.jpeg')) return ContentType.JPEG;
    if (parsedUrl.pathname.endsWith('.gif')) return ContentType.GIF;

    const { headers } = await axios.head(url, {
      headers: BROWSERISH_HEADERS
    });
    const headContentType = headers['content-type'] as string;

    if (ContentTypeToExtension.has(headContentType as ContentType)) {
      return headContentType as ContentType;
    }

    if (ContentShorthandType.has(headContentType)) {
      return ContentShorthandType.get(headContentType);
    }

    return headContentType as ContentType;
  }

  protected sanitizeUrl(url: string | null): string | null {
    if (!url) return null;

    let result = url;

    if (url.startsWith('ipfs://')) {
      return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
    }

    return result;
  }

  protected async verifyUrl(url: string): Promise<boolean> {
    if (!url) return false;

    if (!isURL(url, { require_protocol: true })) return false;

    try {
      await axios.head(url, { headers: BROWSERISH_HEADERS });
      return true;
    } catch {}

    try {
      await axios.get(url, { headers: BROWSERISH_HEADERS });
      return true;
    } catch {}

    return false;
  }

  protected async resolveNullableImageWithFibonacciBackoff<T>({
    cacheKey,
    resolve,
    isResolved,
    unresolvedValue,
    placeholderValue
  }: {
    cacheKey: string;
    resolve: () => Promise<T>;
    isResolved: (value: T) => boolean;
    unresolvedValue: T;
    placeholderValue: T;
  }): Promise<T> {
    const now = Date.now();
    const state = await this.getRetryState(cacheKey);

    if (state?.nextAttemptAt && now < state.nextAttemptAt) {
      return unresolvedValue;
    }

    let result: T = unresolvedValue;
    try {
      result = await resolve();
    } catch {}

    if (isResolved(result)) {
      await this.cacheManager.del(cacheKey);
      return result;
    }

    const failedAttempts = (state?.failedAttempts ?? 0) + 1;
    if (failedAttempts > FIBONACCI_RETRY_DAYS.length) {
      await this.cacheManager.del(cacheKey);
      return placeholderValue;
    }

    const nextAttemptAt = addDays(now, FIBONACCI_RETRY_DAYS[failedAttempts - 1]).getTime();
    await this.cacheManager.set(cacheKey, { failedAttempts, nextAttemptAt }, RESOLVE_TTL);
    return result;
  }

  protected async tryResolveWithTimeout<T>(promise: () => Promise<T>, defaultValue: T, timeoutMs: number): Promise<T> {
    return new Promise<T>(async resolve => {
      let timeoutKey: NodeJS.Timeout = null;
      if (timeoutMs) {
        timeoutKey = setTimeout(() => {
          this.logger.warn(`Failed to resolve a promise, timed out after ${timeoutMs}ms`);
          resolve(defaultValue);
        }, timeoutMs);
      }

      try {
        const result = await promise();
        resolve(result);
      } catch (e) {
        this.logger.warn(`Failed to resolve a promise: ${e.message}`);
      }

      if (timeoutKey) clearTimeout(timeoutKey);
      resolve(defaultValue);
    });
  }

  private async getRetryState(cacheKey: string): Promise<MissingImageRetryState | null> {
    const value = await this.cacheManager.get<MissingImageRetryState>(cacheKey);

    if (isNil(value) || !isNumber(value.failedAttempts) || !isNumber(value.nextAttemptAt)) return null;
    return value;
  }
}
