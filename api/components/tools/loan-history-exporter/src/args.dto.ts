import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class ArgsDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  dbUri: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  outFile: string;
}
