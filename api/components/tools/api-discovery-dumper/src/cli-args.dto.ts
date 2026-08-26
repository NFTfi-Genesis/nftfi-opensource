import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceType } from '@nftfi.api/services/api-discovery';

export enum SpecVersion {
  V2 = '2',
  V3 = '3'
}

export { ServiceType };

export class CliArgsDto {
  @Expose()
  @IsString()
  @IsOptional()
  name: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Expose()
  @Transform(({ value }) => value || SpecVersion.V3)
  @IsEnum(SpecVersion)
  @IsOptional()
  specVersion?: SpecVersion;

  @Expose()
  @IsBoolean()
  @IsOptional()
  includeOptions?: boolean;

  @Expose()
  @Transform(({ value }) => value || ServiceType.ALL)
  @IsEnum(ServiceType)
  @IsOptional()
  service?: ServiceType;

  @Expose()
  @IsString()
  @IsOptional()
  forwardUrl?: string;
}
