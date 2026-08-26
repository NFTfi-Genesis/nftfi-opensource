import { Command } from 'commander';
import { Logger } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { flattenValidationErrors } from '@nftfi.api/validation';
import { ArgsDto } from './args.dto';

export const parseProcessArgs = (): ArgsDto => {
  const program = new Command();

  program.name('Event Archive to Market Loans restorer').version('0.0.1');

  program.requiredOption('--db-uri <arg>', 'Database connection uri');
  program.requiredOption('--cache-uri <arg>', 'Redis connection uri');
  program.requiredOption('--ethereum-provider-uri <arg>', 'Ethereum provider uri');
  program.requiredOption('--api-url <arg>', 'API URL');
  program.requiredOption('--label <arg>', 'Migration label/postfix for cloned market_loans table');
  program.option('--protocol <arg>', 'Protocols to restore', (value, previous: string[]) =>
    previous ? previous.concat(value) : [value]
  );

  program.parse(process.argv);
  const args = program.opts();

  try {
    const dto = transformAndValidateSync(ArgsDto, args, {
      validator: { whitelist: true, forbidNonWhitelisted: true }
    });

    return dto;
  } catch (error) {
    flattenValidationErrors(error).forEach(e => Logger.error(`Validation Error: ${e.message}`));
    throw error;
  }
};
