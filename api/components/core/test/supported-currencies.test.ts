import { SupportedCurrencies } from '../src/supported-currencies';
import { Currency, Ticker } from '../src/supported-currencies.types';

const config = {
  WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
  DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
  USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
};

describe(SupportedCurrencies.name, () => {
  describe('constructor', () => {
    it('should throw if a currency is missing', () => {
      expect(
        () =>
          new SupportedCurrencies({
            WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '123'
          })
      ).toThrow('Invalid address for currency USDC: "123"');
    });

    it('should throw if a currency is duplicated', () => {
      expect(
        () =>
          new SupportedCurrencies({
            WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844'
          })
      ).toThrowError('Duplicate contract addresses found');
    });

    it('should ignore unknown currency keys', () => {
      const currencies = new SupportedCurrencies({
        WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        ['UNKNOWN' as Currency]: '0x0000000000000000000000000000000000000001'
      });

      expect(currencies.getContracts()).toEqual(['0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6']);
    });
  });
  describe('getByContract', () => {
    it('should return the correct currency config', () => {
      const currencies = new SupportedCurrencies(config);
      const currency = currencies.getByContract('0x07865c6e87b9f70255377e024ace6630c1eaa37f');
      expect(currency).toEqual({
        contractAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        denomination: 'mwei',
        denominationDecimals: 6,
        ticker: 'USDC'
      });
    });

    it('should throw when contract is unsupported', () => {
      const currencies = new SupportedCurrencies(config);

      expect(() => currencies.getByContract('0x0000000000000000000000000000000000000000')).toThrow(
        'Unsupported currency address: 0x0000000000000000000000000000000000000000'
      );
    });
  });

  describe('getByTicker', () => {
    it('should return the correct currency config', () => {
      const currencies = new SupportedCurrencies(config);
      const currency = currencies.getByTicker(Ticker.USDC);
      expect(currency).toEqual({
        contractAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        denomination: 'mwei',
        denominationDecimals: 6,
        ticker: 'USDC'
      });
    });

    it('should throw when ticker is unsupported', () => {
      const currencies = new SupportedCurrencies({
        WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6'
      });

      expect(() => currencies.getByTicker(Ticker.DAI)).toThrow('Unsupported currency ticker: DAI');
    });
  });

  describe('getContracts', () => {
    it('should return the correct contract addresses', () => {
      const currencies = new SupportedCurrencies(config);
      const contracts = currencies.getContracts();
      expect(contracts).toEqual([
        '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
      ]);
    });
  });

  describe('forRootAsync', () => {
    it('should return a dynamic module with provider', () => {
      const module = SupportedCurrencies.forRootAsync({
        useFactory: () => new SupportedCurrencies(config)
      });

      expect(module.module).toBe(SupportedCurrencies);
      expect(module.global).toBe(true);
      expect(module.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provide: SupportedCurrencies
          })
        ])
      );
      expect(module.exports).toEqual([SupportedCurrencies]);
    });
  });

  describe('calculateEthAmount', () => {
    it('should return a formatted amount using token decimals', () => {
      const currencies = new SupportedCurrencies(config);

      const result = currencies.calculateEthAmount('0x07865c6e87b9f70255377e024ace6630c1eaa37f', '1000000');

      expect(result).toBe(1);
    });
  });

  describe('calculateUsdAmount', () => {
    it('should return price-multiplied amount for WETH', () => {
      const currencies = new SupportedCurrencies(config);

      const result = currencies.calculateUsdAmount(
        '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        '1000000000000000000',
        2000
      );

      expect(result).toBe(2000);
    });

    it('should return the formatted amount for non-WETH currencies', () => {
      const currencies = new SupportedCurrencies(config);

      const result = currencies.calculateUsdAmount('0x07865c6e87b9f70255377e024ace6630c1eaa37f', '2500000', 2000);

      expect(result).toBe(2.5);
    });
  });
});
