export type CryptoDenomination = 'ether' | 'mwei';
export type Currency = 'WETH' | 'DAI' | 'USDC' | 'USDC_AAVE' | 'APE' | 'GONDI_SAMPLE';
export enum Ticker {
  WETH = 'wETH',
  DAI = 'DAI',
  USDC = 'USDC',
  APE = 'APE',
  GONDI_SAMPLE = 'GONDI_SAMPLE'
}

export interface CurrencyConfig {
  contractAddress: string;
  denomination: CryptoDenomination;
  denominationDecimals: number;
  ticker: Ticker;
}

export const ETHER_DECIMALS = 10 ** 18;
export const MWEI_DECIMALS = 10 ** 6;

export type Params = Partial<Record<Currency, string>>;
export type CurrencyToValuesConfig = Partial<Record<Currency, CurrencyConfig>>;

export const CurrenciesToValues: Record<Currency, Omit<CurrencyConfig, 'contractAddress'>> = {
  WETH: {
    denomination: 'ether',
    denominationDecimals: 18,
    ticker: Ticker.WETH
  },
  DAI: {
    denomination: 'ether',
    denominationDecimals: 18,
    ticker: Ticker.DAI
  },
  USDC: {
    denomination: 'mwei',
    denominationDecimals: 6,
    ticker: Ticker.USDC
  },
  USDC_AAVE: {
    denomination: 'mwei',
    denominationDecimals: 6,
    ticker: Ticker.USDC
  },
  APE: {
    denomination: 'mwei',
    denominationDecimals: 6,
    ticker: Ticker.APE
  },
  GONDI_SAMPLE: {
    denomination: 'mwei',
    denominationDecimals: 6,
    ticker: Ticker.GONDI_SAMPLE
  }
};
