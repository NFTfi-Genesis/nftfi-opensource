import * as path from 'path';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();

  const envSamplePath = path.join(__dirname, '../sample.env');
  const envOverridePath = path.join(__dirname, '../.env');

  dotenv.config({ path: envSamplePath, override: true });
  dotenv.config({ path: envOverridePath, override: true });
}

const redisUrl = new URL(process.env.REDIS_URI!);

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  postgres: {
    url: process.env.POSTGRES_URI!,
    debug: process.env.POSTGRES_DEBUG === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    ttl: process.env.JWT_TTL || '15m'
  },
  redis: {
    host: redisUrl.hostname ?? 'localhost',
    port: parseInt(redisUrl.port ?? '6379') as number
  },
  ethereum: {
    provider: {
      url: process.env.ETHEREUM_PROVIDER_URL!
    }
  },
  chainalysis: {
    url: process.env.CHAINALYSIS_API_URL!,
    apiKey: process.env.CHAINALYSIS_API_KEY!
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL!
  }
};

export type Config = typeof config;

export default (): Config => config;
