import * as path from 'path';
import * as fs from 'fs';
import { Storage, File } from '@google-cloud/storage';
import { DynamicModule, FactoryProvider } from '@nestjs/common';

interface CopyTarget {
  gsBucket: string;
  gsFilepath: string;
}

type GcpStorageFacadeModuleAsyncOptions = Pick<FactoryProvider<{ projectId: string }>, 'useFactory' | 'inject'>;

export class GcpStorageFacade {
  private readonly storage: Storage;

  constructor(projectId: string) {
    this.storage = new Storage({ projectId });
  }

  static forRootAsync(options: GcpStorageFacadeModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      module: GcpStorageFacade,
      providers: [
        {
          provide: GcpStorageFacade,
          inject: options.inject,
          useFactory: async (...args: unknown[]): Promise<GcpStorageFacade> => {
            const config = await options.useFactory(...args);
            return new GcpStorageFacade(config.projectId);
          }
        }
      ],
      exports: [GcpStorageFacade]
    };
  }

  async getBucketObjects(gsBucket: string, gsDir = ''): Promise<File[]> {
    const bucket = this.storage.bucket(gsBucket, {});
    const [objects] = await bucket.getFiles({ prefix: gsDir });
    return objects;
  }

  async getBucketFiles(gsBucket: string, gsDir = ''): Promise<File[]> {
    const files = await this.getBucketObjects(gsBucket, gsDir);
    return files.filter(file => file.metadata.size !== '0');
  }

  async getBucketFilepaths(bucket: string): Promise<string[]> {
    const files = await this.getBucketFiles(bucket);
    return files.map(file => `${bucket}/${file.name}`);
  }

  async getLatestBucketFile(gsBucket: string, gsDir = ''): Promise<File | null> {
    const files = await this.getBucketFiles(gsBucket, gsDir);
    if (!files.length) return null;
    files.sort((a, b) => Number(b.metadata.generation) - Number(a.metadata.generation));
    return files[0];
  }

  async upload(gsBucketpath: string, distFilepath: string): Promise<[string, File]> {
    const gsBucket = new URL(gsBucketpath);
    const destination = path.join(gsBucket.pathname, path.basename(distFilepath)).split('/').filter(Boolean).join('/');
    const bucket = this.storage.bucket(gsBucket.host);
    const [file] = await bucket.upload(distFilepath, { destination });
    return [`${gsBucket.href}/${path.basename(distFilepath)}`, file];
  }

  async uploadBufferToBucket(
    gsBucket: string,
    distFileName: string,
    data: Buffer | NodeJS.ArrayBufferView
  ): Promise<void> {
    const file = this.storage.bucket(gsBucket).file(distFileName);
    return new Promise((resolve, reject) =>
      file.createWriteStream().on('finish', resolve).on('error', reject).end(data)
    );
  }

  async downloadFromBucket(gsBucket: string, gsFilePath: string, distFilePath: string): Promise<void> {
    const distFileDir = path.dirname(distFilePath);
    fs.mkdirSync(distFileDir, { recursive: true });
    const bucket = this.storage.bucket(gsBucket);
    await bucket.file(gsFilePath).download({ destination: distFilePath });
  }

  async downloadFolderFromBucket(gsBucket: string, gsDir: string, distDir: string): Promise<string> {
    const bucket = this.storage.bucket(gsBucket);
    const [files] = await bucket.getFiles({ prefix: gsDir });
    for (const file of files) {
      const distFile = path.join(distDir, file.name);
      const distFileDir = path.dirname(distFile);
      fs.mkdirSync(distFileDir, { recursive: true });
      await file.download({ destination: distFile });
    }
    return path.join(distDir, gsDir);
  }

  async copyFileToBucket(src: CopyTarget, dst: CopyTarget): Promise<void> {
    const dstBucket = this.storage.bucket(dst.gsBucket).file(dst.gsFilepath);
    await this.storage
      .bucket(src.gsBucket)
      .file(src.gsFilepath)
      .copy(dstBucket, {
        preconditionOpts: {
          ifGenerationMatch: 0
        }
      });
  }

  async exists(gsBucket: string, gsFile): Promise<boolean> {
    const bucket = this.storage.bucket(gsBucket);
    const [res] = await bucket.file(gsFile).exists();
    return res;
  }

  static parseBucketPath(bucketPath: string): { bucket: string; path: string; filename: string } {
    const { protocol, host, pathname } = new URL(bucketPath);
    return {
      bucket: `${protocol}//${host}`,
      path: pathname.startsWith('/') ? pathname.slice(1) : pathname,
      filename: path.basename(pathname)
    };
  }
}
