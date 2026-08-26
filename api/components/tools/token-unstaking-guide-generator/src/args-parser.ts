import { Command } from 'commander';
import { Logger } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { flattenValidationErrors } from '@nftfi.api/validation';
import { ArgsDto } from './args.dto';

export const parseProcessArgs = (): ArgsDto => {
  const program = new Command();

  program.name('NFTFI Token Unstaking Guide Generator').version('0.0.1');

  program.requiredOption('--rpc-url <arg>', 'Mainnet JSON-RPC endpoint (never written to output)');
  program.requiredOption('--public-out-file <arg>', 'Path of the public, user-facing lookup document to write');
  program.requiredOption('--review-out-file <arg>', 'Path of the internal developer review report to write');
  program.option('--block <arg>', 'Generation block to pin reads to (defaults to the latest block)');

  program.parse(process.argv);
  const args = program.opts();

  try {
    return transformAndValidateSync(ArgsDto, args, {
      validator: { whitelist: true, forbidNonWhitelisted: true }
    });
  } catch (error) {
    flattenValidationErrors(error).forEach(e => Logger.error(`Validation Error: ${e.message}`));
    throw error;
  }
};
