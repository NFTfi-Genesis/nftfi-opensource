import { DynamicModule, Global, Module } from '@nestjs/common';
import { EthersModule } from 'nestjs-ethers';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { EthersFacade } from './ethers.facade';
import {
  EthersProviderModuleAsyncOptions,
  EthersProviderModuleConfig,
  getModuleConfigFactoryProvider
} from './ethers-provider.types';

@Global()
@Module({})
export class EthersProviderModule {
  static forRootAsync(options: EthersProviderModuleAsyncOptions): DynamicModule {
    const configFactoryProvider = getModuleConfigFactoryProvider(options);
    return {
      module: EthersProviderModule,
      global: true,
      imports: [
        EthersModule.forRootAsync({
          ...options,
          async useFactory(...args) {
            const ethersModuleOptions: EthersProviderModuleConfig = configFactoryProvider.useFactory(...args);
            const rpcProvider = new StaticJsonRpcProvider(ethersModuleOptions.provider);
            const network = await rpcProvider.getNetwork();
            return {
              network: {
                chainId: Number(network.chainId),
                name: network.name
              },
              useDefaultProvider: false,
              custom: {
                url: ethersModuleOptions.provider.url
              }
            };
          }
        })
      ],
      providers: [configFactoryProvider, EthersFacade],
      exports: [EthersFacade]
    };
  }
}
