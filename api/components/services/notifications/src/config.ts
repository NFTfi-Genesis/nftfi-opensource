import path from 'path';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();

  const envSamplePath = path.join(__dirname, '../sample.env');
  const envOverridePath = path.join(__dirname, '../.env');

  dotenv.config({ path: envSamplePath, override: true });
  dotenv.config({ path: envOverridePath, override: true });
}

const redisUrl = new URL(process.env.REDIS_URI);

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  redis: {
    host: redisUrl.hostname ?? 'localhost',
    port: parseInt(redisUrl.port ?? '6379') as number
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL
  },
  postgres: {
    url: process.env.POSTGRES_URI,
    debug: process.env.POSTGRES_DEBUG === 'true'
  },
  mailer: {
    templates: {
      path: process.env.MAILER_TEMPLATES_PATH
    },
    from: process.env.MAILER_FROM,
    transport: {
      mailhog: {
        host: process.env.MAILER_MAILHOG_HOST,
        port: parseInt(process.env.MAILER_MAILHOG_PORT)
      },
      sendgrid: {
        apiKey: process.env.MAILER_SENDGRID_API_KEY
      }
    }
  },
  discord: {
    bot: {
      token: process.env.DISCORD_BOT_TOKEN,
      channel: process.env.DISCORD_BOT_CHANNEL || ''
    }
  },
  nftfi: {
    dappUrl: process.env.NFTFI_URL,
    static: {
      logoUrl: process.env.NFTFI_STATIC_LOGO_URL,
      walletUrl: process.env.NFTFI_STATIC_WALLET_URL,
      twitterUrl: process.env.NFTFI_STATIC_TWITTER_URL,
      discordUrl: process.env.NFTFI_STATIC_DISCORD_URL
    }
  }
};

export type Config = typeof config;

export default (): Config => config;
