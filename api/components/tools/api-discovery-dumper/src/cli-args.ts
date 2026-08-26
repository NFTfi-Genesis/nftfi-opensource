import { Command } from 'commander';
import { transformAndValidateSync } from 'class-transformer-validator';
import { MODULE_NAME } from './types';
import { CliArgsDto } from './cli-args.dto';

export const parseProcessArgs = (): CliArgsDto => {
  const program = new Command();

  program.name(MODULE_NAME).version('1.0.0');

  program.requiredOption('--path <path>', 'Filepath');
  program.option('--name <name>', 'Name of the document');
  program.option('--spec-version <version>', 'OpenApi Spec version');
  program.option('--include-options', 'Include Options methods in the document');
  program.option('--service <service>', 'Service type to document (all, offers, authorization, loans)');
  program.option('--forward-url <url>', 'Forward URL for the API server');

  program.parse(process.argv);

  const args = program.opts();

  const dto = transformAndValidateSync(CliArgsDto, args, {
    validator: { whitelist: true, forbidNonWhitelisted: true }
  });

  return dto;
};
