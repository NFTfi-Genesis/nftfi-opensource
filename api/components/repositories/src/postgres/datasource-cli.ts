import { buildDatasource } from './datasource';

const pgUri = process.env.POSTGRES_TARGET_URI;

if (!pgUri) {
  throw new Error('POSTGRES_TARGET_URI environment variable is not set');
}

export const CLIDatasource = buildDatasource({
  url: pgUri
});
