import { buildEtherscanForeclosureUrl, buildOpenseaAssetUrl } from '../src/links';

describe('links', () => {
  describe(buildOpenseaAssetUrl.name, () => {
    it('builds an ethereum-mainnet OpenSea item url with a lower-cased contract', () => {
      expect(buildOpenseaAssetUrl('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', '7777')).toBe(
        'https://opensea.io/item/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/7777'
      );
    });
  });

  describe(buildEtherscanForeclosureUrl.name, () => {
    it('deep-links to the liquidate function via its write-function anchor', () => {
      expect(buildEtherscanForeclosureUrl('0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207', 'F9')).toBe(
        'https://etherscan.io/address/0xd0a40eB7FD94eE97102BA8e9342243A2b2E22207#writeContract#F9'
      );
    });

    it('falls back to the write tab when no anchor is known', () => {
      expect(buildEtherscanForeclosureUrl('0xunknown', null)).toBe(
        'https://etherscan.io/address/0xunknown#writeContract'
      );
    });
  });
});
