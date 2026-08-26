import 'pg';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { EthereumEvent } from './ethereum-event';
import { MarketLoan } from './market-loan';
import { FxRate } from './fx-rate';
import { Collection, CollectionStats } from './collection';
import { CollectionAsset } from './collection-asset';
import { CollectionFloorPrice } from './collection-floor-price';
import { Listing } from './listing';
import { NftfiSmartNftId } from './nftfi-smart-nft-id';
import { Notification } from './notification';
import { NotificationSubscription } from './notification-subscription';
import { Account, AccountContact } from './account';
import { Offer } from './offer';
import { Renegotiation } from './renegotiation';

export interface DatasourceOptions {
  url: string;
  debug?: boolean;
}

const logger = new Logger('PostgresDatasource');

export const buildDatasource = (options: DatasourceOptions): DataSource => {
  if (options.debug) {
    logger.log(`Starting Postgres in debug mode...`);
  }
  return new DataSource({
    type: 'postgres',
    logging: options.debug ? 'all' : false,
    url: options.url,
    synchronize: false,
    entities: [
      Account,
      AccountContact,
      EthereumEvent,
      MarketLoan,
      FxRate,
      Collection,
      CollectionAsset,
      CollectionFloorPrice,
      CollectionStats,
      NftfiSmartNftId,
      Notification,
      NotificationSubscription,
      Offer,
      Listing,
      Renegotiation
    ],
    migrations: [],
    migrationsRun: false,
    migrationsTableName: 'migrations',
    migrationsTransactionMode: 'each'
  });
};
