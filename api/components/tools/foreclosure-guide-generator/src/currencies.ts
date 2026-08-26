/**
 * Currency map required to construct `SupportedCurrencies`, a constructor dependency of
 * `MarketLoanRepository`. The foreclosure query itself reads no currency data, but the repository
 * is shared and validates this map on instantiation. Mirrors the restorer's `EthCurrencies`.
 */
export const EthCurrencies = {
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  APE: '0x4d224452801aced8b2f0aebe155379bb5d594381'
};
