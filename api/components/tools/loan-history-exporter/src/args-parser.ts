import { Command } from 'commander';
import { Logger } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { flattenValidationErrors } from '@nftfi.api/validation';
import { ArgsDto } from './args.dto';

export const parseProcessArgs = (): ArgsDto => {
  const program = new Command();

  program.name('NFTfi Loan History Exporter').version('0.0.1');

  program.requiredOption('--db-uri <arg>', 'Database connection uri');
  program.requiredOption('--out-file <arg>', 'Path of the CSV file to write');

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
