import { Logger } from '@nestjs/common';
import { EventArchiveReplayService } from '@nftfi.api/modules/ethers-observer';
import { parseProcessArgs } from './args-parser';
import { compileAppModule } from './compile-app-module';

const main = async (): Promise<void> => {
  const args = parseProcessArgs();

  const appModule = await compileAppModule({
    label: args.label,
    protocols: args.protocols,
    postgres: { uri: args.dbUri },
    cache: { uri: args.cacheUri },
    apiUrl: args.apiUrl,
    ethereum: { provider: { uri: args.ethereumProviderUri } }
  });

  const eventArchiveReplayService = appModule.get(EventArchiveReplayService);
  await eventArchiveReplayService.replayEvents();

  await appModule.close();
};

main()
  .then(() => process.exit(0))
  .catch(e => {
    Logger.error('Error during execution:', e);
    process.exit(1);
  });
