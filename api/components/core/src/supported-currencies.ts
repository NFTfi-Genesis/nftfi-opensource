import { formatUnits } from 'ethers/lib/utils';
import { DynamicModule, FactoryProvider } from '@nestjs/common';
import { isEthereumAddress } from 'class-validator';
import {
  CurrencyToValuesConfig,
  Currency,
  CurrenciesToValues,
  Params,
  CurrencyConfig,
  Ticker
} from './supported-currencies.types';

export type SupportedCurrenciesModuleAsyncOptions = Pick<FactoryProvider<SupportedCurrencies>, 'inject' | 'useFactory'>;

export class SupportedCurrencies {
  private config: CurrencyToValuesConfig;

  constructor(params: Params) {
    this.config = Object.entries(params).reduce((acc, [name, address]) => {
      const values = CurrenciesToValues[name as Currency];
      if (!values) return acc;

      if (!isEthereumAddress(address)) {
        throw new Error(`Invalid address for currency ${name}: "${address}"`);
      }

      acc[name] = {
        contractAddress: address.toLowerCase(),
        denomination: values.denomination,
        denominationDecimals: values.denominationDecimals,
        ticker: values.ticker
      };
      return acc;
    }, {});

    this.validate();
  }

  static forRootAsync(options: SupportedCurrenciesModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      module: SupportedCurrencies,
      providers: [
        {
          provide: SupportedCurrencies,
          ...options
        }
      ],
      exports: [SupportedCurrencies]
    };
  }

  calculateUsdAmount(currencyAddress: string, amount: string, price: number): number {
    const config = this.getByContract(currencyAddress);
    const ethAmount = this.calculateEthAmount(currencyAddress, amount);
    if (config.ticker === Ticker.WETH) return ethAmount * price;

    return ethAmount;
  }

  calculateEthAmount(currencyAddress: string, amount: string): number {
    const config = this.getByContract(currencyAddress);
    const formattedAmount = Number(formatUnits(amount, config.denominationDecimals));

    return formattedAmount;
  }

  getByContract(address: string): CurrencyConfig {
    const entries = Object.values(this.config);
    const lcAddress = address.toLowerCase();
    const config = entries.find(config => config.contractAddress === lcAddress);
    if (!config) {
      throw new Error(`Unsupported currency address: ${address}`);
    }
    return config;
  }

  getByTicker(ticker: Ticker): CurrencyConfig {
    const entries = Object.values(this.config);
    const config = entries.find(config => config.ticker === ticker);
    if (!config) {
      throw new Error(`Unsupported currency ticker: ${ticker}`);
    }
    return config;
  }

  getContracts(): string[] {
    return Object.values(this.config).map(c => c.contractAddress);
  }

  private validate(): void {
    const addresses = Object.values(this.config).map(c => c.contractAddress);
    const uniqueAddresses = [...new Set(addresses)];
    if (addresses.length !== uniqueAddresses.length) {
      throw new Error('Duplicate contract addresses found');
    }
  }
}
