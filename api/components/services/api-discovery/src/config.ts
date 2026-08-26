import path from 'path';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();

  const envSamplePath = path.join(__dirname, '../sample.env');
  const envOverridePath = path.join(__dirname, '../.env');

  dotenv.config({ path: envSamplePath, override: true });
  dotenv.config({ path: envOverridePath, override: true });
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const config = {
  port,
  forwardUrl: process.env.API_FORWARD_URL || `http://localhost:${port}`
};

export type Config = typeof config;

export default (): Config => config;
