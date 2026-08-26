export const NPF_FORWARDED_COLLECTIONS = new Map<string, string[]>([
  [
    'cryptopunks',
    [
      '0x000000000000003607fce1ac9e043a86675c5c2f',
      '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6',
      '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb'
    ]
  ],
  ['beeple-everydays', ['0xc170384371494b2a8f6ba20f4d085c4dde763d96']],
  ['beeple-everydays-2022', ['0x44541d1ff5e8a1ed22566df771995fff9139f122']],
  ['queens-open-edition-by-hackatao', ['0xb396b8699f728735f28a31279d07b1d0d2411baa']],
  ['biome-lumina-dataland-by-refik-anadol', ['0xb097fba49a679a61b18b7079b99a953ca2691c9d']],
  ['select-works-by-xcopy', ['0xd652d2633CDBfD5f27F50cdDb098e708fa8433f3']],
  [
    'max-pain-and-frens-by-xcopy',
    ['0xd1169e5349d1cB9941F3DCbA135C8A4b9eACFDDE', '0x18a62e93ff3ab180e0c7abd4812595bf2be3405f']
  ],
  ['siphon-by-xcopy', ['0x905e7e152ecd7315f03d8d671578ea72684cca99']]
]);

export const ASSET_SIZES = {
  small: {
    maxHeight: 320,
    maxWidth: 320
  },
  medium: {
    maxHeight: 640,
    maxWidth: 640
  }
};

export const COLLECTION_SIZES = {
  small: {
    maxHeight: 320,
    maxWidth: 320
  }
};

export const IMAGE_PLACEHOLDER_URL = 'https://app.nftfi.com/ns/assets/placeholder.png';

interface ImageDefaults {
  [key: string]: {
    imageUrl: string;
    name: ((tokenId: string) => string) | string;
  };
}

export const COLLECTION_DEFAULTS = {
  '0x823de2c44369e94cac3da789ad4b6493e27e4bfe': {
    imageUrl: 'https://app.nftfi.com/ns/assets/gondi-vault.png',
    name: tokenId => `Gondi Vault #${tokenId}`
  },
  '0x14a6dcebb2bb73aae1b199ccaada75247b81976d': {
    imageUrl: 'https://app.nftfi.com/ns/assets/gondi-vault.png',
    name: tokenId => `Gondi Vault #${tokenId}`
  }
} as ImageDefaults;
