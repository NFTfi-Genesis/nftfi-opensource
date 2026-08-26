import { AssetProjection } from '@nftfi.api/facades/assets';

export type GetOptions = {
  skip: number;
  limit: number;
  whitelisted?: boolean;
};

export type AssetDtoOptions = {
  projection: AssetProjection[];
};
