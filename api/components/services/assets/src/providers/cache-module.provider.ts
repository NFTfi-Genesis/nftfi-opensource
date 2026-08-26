import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { Config } from '../config';

export const CacheModuleProvider = CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService<Config>) => {
    const redisConfig: Config['redis'] = config.get('redis');
    const store = await redisStore({
      port: redisConfig.port,
      host: redisConfig.host
    });

    return {
      store,
      ttl: 60 * 60 * 24 * 7
    };
  }
});
