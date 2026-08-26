export const AssetMockConfigToken = 'AssetMockModuleConfig';

export interface AssetModuleConfig {
  apiUrl: string;
}

export type AssetModuleOptions = Pick<AssetModuleConfig, 'apiUrl'>;
