import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { Expose, Type } from 'class-transformer';

export class ArgsDto {
  /** Mainnet JSON-RPC endpoint. Never printed into the generated files. */
  @Expose()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  rpcUrl: string;

  /** Path of the public, user-facing lookup document to write. */
  @Expose()
  @IsString()
  @IsNotEmpty()
  publicOutFile: string;

  /** Path of the internal developer review report to write. */
  @Expose()
  @IsString()
  @IsNotEmpty()
  reviewOutFile: string;

  /** Generation block to pin every read to. Defaults to the latest block when omitted. */
  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  block?: number;
}
