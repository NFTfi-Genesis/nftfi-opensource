import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import { parseProcessArgs } from './args-parser';
import { compileAppModule } from './compile-app-module';
import { LockReaderService } from './chain/lock-reader.service';
import { UnstakingReportService } from './unstaking-report.service';
import { writeReportOutputs } from './publish';

const main = async (): Promise<void> => {
  const args = parseProcessArgs();

  const appModule = await compileAppModule({ rpcUrl: args.rpcUrl });
  const reader = appModule.get(LockReaderService);
  const reportService = appModule.get(UnstakingReportService);

  const block = args.block ?? (await reader.getLatestBlock());
  Logger.log(`Generating token unstaking guide at block ${block}`);

  const report = await reportService.generate(block, new Date());

  const reviewPath = resolve(args.reviewOutFile);
  const publicPath = resolve(args.publicOutFile);
  const { published, staleRemoved } = await writeReportOutputs(report, {
    publicOutFile: publicPath,
    reviewOutFile: reviewPath
  });
  Logger.log(`Developer report written to ${reviewPath}`);

  if (published) {
    Logger.log(`Public guide written to ${publicPath} (${report.rows.length} rows)`);
  } else {
    const reconciliationFailures = report.reconciliation.filter(check => !check.passed).length;
    Logger.warn(
      `Publish gate blocked: ${report.errors.length} error(s), ${reconciliationFailures} failed ` +
        `reconciliation check(s). Resolve them via ${reviewPath} and re-run.` +
        (staleRemoved ? ` Removed a stale public guide at ${publicPath}.` : ' No public file written.')
    );
  }

  await appModule.close();

  if (!published) process.exitCode = 2;
};

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(e => {
    Logger.error('Error during execution:', e);
    process.exit(1);
  });
