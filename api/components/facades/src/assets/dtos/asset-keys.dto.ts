import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { isArray, isNil } from 'lodash';
import { AssetDto } from './asset.dto';

export class AssetKeyDto extends PickType(AssetDto, ['contract', 'tokenId'] as const) {}

export const TransformAssetKeys = Transform(({ value }: { value: string | string[] }) => {
  const parseKey = (keyStr: string): AssetKeyDto => {
    const [contract, tokenId] = keyStr.split('-');
    return plainToInstance(AssetKeyDto, { contract, tokenId });
  };

  if (isNil(value)) {
    return value;
  }

  if (isArray(value)) {
    return value.map(item => parseKey(item));
  }

  return value.split(',').map((item: string) => parseKey(item));
});

export class AssetKeysDto {
  @Expose()
  @Type(() => AssetKeyDto)
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Array of asset keys "<contract>-<tokenId>"',
    required: false
  })
  keys: AssetKeyDto[];
}
