import fs from 'fs';
import path from 'path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { buildOpenapiDocument } from '@nftfi.api/services/api-discovery';
import { MODULE_NAME } from './types';
import { parseProcessArgs } from './cli-args';
import { AppModule } from './app.module';
import { DocumentCompilerService } from './document-compiler.service';

const main = async (): Promise<void> => {
  const logger = new Logger(MODULE_NAME);
  const cliArgs = parseProcessArgs();

  const app = await NestFactory.create(AppModule);
  const service = app.get(DocumentCompilerService);

  const document = await buildOpenapiDocument({
    name: cliArgs.name,
    service: cliArgs.service,
    config: cliArgs.forwardUrl ? { forwardUrl: cliArgs.forwardUrl } : undefined
  });
  if (fs.existsSync(cliArgs.path)) fs.unlinkSync(cliArgs.path);

  const result = await service.compile(document, cliArgs);

  // Ensure the directory structure exists
  const dir = path.dirname(cliArgs.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  logger.log(`Saving document to a file - ${cliArgs.path}`);
  fs.writeFileSync(cliArgs.path, result);

  logger.log('Operation succesfully completed!');
};

main().then(() => process.exit(0));
