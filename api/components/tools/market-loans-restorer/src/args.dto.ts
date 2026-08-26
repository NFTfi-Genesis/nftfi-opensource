import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';

export class ArgsDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/)
  label: string;

  @Expose({ name: 'protocol' })
  @Transform(({ value }: { value: string[] }) => (!value ? [] : value))
  @IsEnum(MarketLoanProtocol, { each: true })
  @IsOptional()
  protocols: MarketLoanProtocol[];

  @Expose()
  @IsString()
  @IsNotEmpty()
  dbUri: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  cacheUri: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  apiUrl: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  ethereumProviderUri: string;
}
