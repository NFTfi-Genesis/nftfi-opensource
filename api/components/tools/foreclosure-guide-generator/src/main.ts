import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import { parseProcessArgs } from './args-parser';
import { compileAppModule } from './compile-app-module';
import { ForeclosureGuideService } from './foreclosure-guide.service';

const main = async (): Promise<void> => {
  const args = parseProcessArgs();

  const appModule = await compileAppModule({ postgres: { uri: args.dbUri } });

  const foreclosureGuideService = appModule.get(ForeclosureGuideService);
  const markdown = await foreclosureGuideService.generateMarkdown(new Date());

  const outPath = resolve(args.outFile);
  await writeFile(outPath, markdown, 'utf8');
  Logger.log(`Foreclosure guide written to ${outPath}`);

  await appModule.close();
};

main()
  .then(() => process.exit(0))
  .catch(e => {
    Logger.error('Error during execution:', e);
    process.exit(1);
  });
