import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import sharp, { Sharp } from 'sharp';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'fluent-ffmpeg';
import { DynamicModule, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BROWSERISH_HEADERS, ContentTypeToExtension } from './metadata.constants';
import { ContentType } from './metadata.types';
import { MAX_DATA_URL_CHARS, MAX_DATA_URL_DECODED_BYTES, MediaDimensions } from './media-processor.types';
import { Config } from './config';

@Injectable()
export class MediaProcessorService {
  protected readonly logger = new Logger(MediaProcessorService.name);

  constructor(private readonly configService: ConfigService) {}

  static forRoot(): DynamicModule {
    return {
      module: MediaProcessorService,
      global: true,
      providers: [MediaProcessorService],
      exports: [MediaProcessorService]
    };
  }

  async loadAndResize(
    url: string,
    contentType: ContentType,
    size: MediaDimensions,
    outputPath: string
  ): Promise<string> {
    const outputFileExtension = this.getOutputFileExtension(contentType);
    const isVideoContent = this.getIsVideoContent(contentType);
    const outputPathFinal = outputPath + '.' + outputFileExtension;

    const fetched = await this.fetchTempInputFile(url, contentType, outputPath + '.tmp');
    const key = `${path.basename(path.dirname(outputPath))}/${path.basename(outputPath)}`;
    this.logger.log(
      `Processing image key=${key} contentType=${contentType} bytes=${fetched.bytes} source=${fetched.source}`
    );

    return await (isVideoContent
      ? this.processVideo(fetched.path, size, outputPathFinal, outputFileExtension)
      : this.processImage(fetched.path, contentType, size, outputPathFinal, outputFileExtension));
  }

  private async fetchTempInputFile(
    url: string,
    contentType: ContentType,
    outputTempPath: string
  ): Promise<{ path: string; bytes: number; source: 'http' | 'data-url' }> {
    const isDownloadableSource = this.getIsDownloadableSource(url, contentType);
    const maxBytes = this.configService.get<Config['images']['maxBytes']>('images.maxBytes') ?? Infinity;

    if (!isDownloadableSource) {
      const bytes = await this.writeDataUrlToFile(url, outputTempPath);
      return { path: outputTempPath, bytes, source: 'data-url' };
    }

    const res = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
      headers: BROWSERISH_HEADERS,
      decompress: true,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes
    });

    const declared = parseInt(String(res.headers?.['content-length'] ?? ''), 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      (res.data as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
      throw new Error(`Image too large for ${outputTempPath}: declared ${declared} bytes exceeds cap ${maxBytes}`);
    }

    let bytes = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb): void {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          cb(new Error(`Image too large for ${outputTempPath}: streamed ${bytes} bytes exceeds cap ${maxBytes}`));
          return;
        }
        cb(null, chunk);
      }
    });
    await pipeline(res.data, counter, fs.createWriteStream(outputTempPath));

    return { path: outputTempPath, bytes, source: 'http' };
  }

  private async writeDataUrlToFile(dataUrl: string, outputPath: string): Promise<number> {
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error('Data URL too large');
    }

    const match = dataUrl.match(/^data:([^;,]+)(;[^,]*)?,(.*)$/i);
    if (!match) throw new Error('Invalid data URL');

    const params = match[2] || '';
    const payload = match[3];

    const isBase64 = /;base64/i.test(params);
    if (isBase64) {
      const decodedBytes = Buffer.byteLength(payload, 'base64');
      if (decodedBytes > MAX_DATA_URL_DECODED_BYTES) {
        throw new Error('Data URL too large');
      }
      await fs.promises.writeFile(outputPath, payload, { encoding: 'base64' });
      return decodedBytes;
    }

    const decoded = decodeURIComponent(payload);
    const decodedBytes = Buffer.byteLength(decoded, 'utf8');
    if (decodedBytes > MAX_DATA_URL_DECODED_BYTES) {
      throw new Error('Data URL too large');
    }
    await fs.promises.writeFile(outputPath, decoded, { encoding: 'utf8' });
    return decodedBytes;
  }

  private async processVideo(
    inputPath: string,
    size: MediaDimensions,
    outputTempPath: string,
    fileExtension: keyof sharp.FormatEnum
  ): Promise<string> {
    const tempVideoGifFile = outputTempPath + '.tmp';
    await this.transcodeVideoToGif(inputPath, tempVideoGifFile, size);
    await this.processImage(tempVideoGifFile, ContentType.GIF, size, outputTempPath, fileExtension);
    return outputTempPath;
  }

  private async transcodeVideoToGif(inputPath: string, outputPath: string, size: MediaDimensions): Promise<void> {
    const fps = 12;
    const width = size.maxWidth;
    const dither = 'bayer';

    await new Promise<void>((resolve, reject) => {
      ffmpeg({ source: inputPath })
        .complexFilter([
          { filter: 'fps', options: fps, inputs: '0:v', outputs: 'a' },
          { filter: 'scale', options: `${width}:-1:flags=lanczos`, inputs: 'a', outputs: 'b' },
          { filter: 'split', options: 2, inputs: 'b', outputs: ['c', 'd'] },
          { filter: 'palettegen', options: 'stats_mode=diff', inputs: 'c', outputs: 'p' },
          { filter: 'paletteuse', options: `dither=${dither}`, inputs: ['d', 'p'], outputs: 'out' }
        ])
        .outputOptions(['-map', '[out]'])
        .format('gif')
        .on('error', err => {
          this.logger.error('FFMPEG error:', err);
          reject(err);
        })
        .on('end', () => resolve())
        .save(outputPath);
    });
  }

  private async processImage(
    inputPath: string,
    contentType: ContentType,
    size: MediaDimensions,
    outputTempPath: string,
    fileExtension: keyof sharp.FormatEnum
  ): Promise<string> {
    const processor = await (async (): Promise<Sharp> => {
      if (contentType === ContentType.SVG) {
        const svgContent = await fs.promises.readFile(inputPath, 'utf8');
        const pngBuffer = await this.renderSvgWithBrowser(svgContent);
        return sharp(pngBuffer, { limitInputPixels: false });
      }
      if (contentType === ContentType.GIF) {
        return sharp(inputPath, { limitInputPixels: false, animated: true }).gif();
      }
      return sharp(inputPath, { limitInputPixels: false });
    })();

    const metadata = await processor.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to determine image dimensions');
    }

    const scale = Math.min(size.maxWidth / metadata.width, size.maxHeight / (metadata.pageHeight ?? metadata.height));
    const width = Math.floor(metadata.width * scale);
    const height = Math.floor(metadata.height * scale);

    processor.resize(width, height, {
      width: size.maxWidth,
      height: size.maxHeight,
      fit: 'inside',
      withoutEnlargement: true
    });

    await processor.toFormat(fileExtension, { palette: true }).toFile(outputTempPath);
    return outputTempPath;
  }

  private async renderSvgWithBrowser(svgContent: string): Promise<Buffer> {
    const viewBoxMatch = svgContent.match(/viewBox\s*=\s*['"]\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
    const width = viewBoxMatch ? Math.ceil(parseFloat(viewBoxMatch[1])) : 512;
    const height = viewBoxMatch ? Math.ceil(parseFloat(viewBoxMatch[2])) : 512;

    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(
        `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${svgContent}</body></html>`,
        { waitUntil: 'load' }
      );
      return (await page.screenshot({ type: 'png' })) as Buffer;
    } finally {
      await browser.close();
    }
  }

  private getOutputFileExtension(contentType: ContentType): keyof sharp.FormatEnum {
    const fileExtension = ContentTypeToExtension.get(contentType);
    if (!fileExtension) {
      throw new Error(`Unsupported file type: ${contentType}`);
    }
    return fileExtension;
  }

  private getIsVideoContent(contentType: ContentType): boolean {
    return [ContentType.MP4, ContentType.QUICKTIME].includes(contentType);
  }

  private getIsDownloadableSource(url: string, contentType: ContentType): boolean | null {
    if (contentType === ContentType.SVG && url.startsWith('data:image/svg+xml')) {
      return false;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }
    return null;
  }
}
