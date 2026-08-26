import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import { parseProcessArgs } from './args-parser';
import { compileAppModule } from './compile-app-module';
import { LoanHistoryExportService } from './loan-history-export.service';

const main = async (): Promise<void> => {
  const args = parseProcessArgs();

  const appModule = await compileAppModule({ postgres: { uri: args.dbUri } });

  const exportService = appModule.get(LoanHistoryExportService);
  const outPath = resolve(args.outFile);
  const total = await exportService.exportToFile(outPath);
  Logger.log(`Loan history (${total} loans) written to ${outPath}`);

  await appModule.close();
};

main()
  .then(() => process.exit(0))
  .catch(e => {
    Logger.error('Error during execution:', e);
    process.exit(1);
  });
