export type OpenseaTokenStandard = 'erc721' | 'erc1155' | 'cryptopunks';

export interface OpenseaNft {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: OpenseaTokenStandard;
  name: string;
  description: string;
  image_url: string;
  display_image_url: string;
  display_animation_url: null;
  metadata_url: string;
  opensea_url: string;
  updated_at: string;
  is_disabled: false;
  is_nsfw: false;
  animation_url: null;
  is_suspicious: false;
  creator: '';
  traits: [];
  owners: [];
  rarity: { strategy_id: 'openrarity'; strategy_version: '1.0'; rank: null };
}

export interface OpenseaContractMetadata {
  address: string;
  chain: string;
  collection: string;
  contract_standard: OpenseaTokenStandard;
  name: string;
  total_supply: number;
}

export interface OpenseaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: {};
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  collection_offers_enabled: boolean;
  opensea_url: string;
  project_url: string;
  wiki_url: string;
  discord_url: string;
  telegram_url: string;
  twitter_username: string;
  instagram_username: string;
  contracts: { address: string }[];
  editors: string[];
  fees: { fee: number; recipient: string; required: boolean }[];
  required_zone: string;
  rarity: {
    strategy_version: string;
    calculated_at: string; // "Isoformat datetime when the rarity was calculated",
    max_rank: number;
    total_supply: number;
  };
  payment_tokens: {
    symbol: string;
    address: string;
    chain: string;
    image: string;
    name: string;
    decimals: number;
    eth_price: string;
    usd_price: string;
  }[];
  total_supply: number;
  created_date: string; // "2025-10-02"
}
