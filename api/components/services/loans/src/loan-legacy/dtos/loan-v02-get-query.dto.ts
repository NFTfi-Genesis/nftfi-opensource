import { ApiProperty } from '@nestjs/swagger';
import { Optional } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsEthereumAddress, IsIn, IsOptional, ValidateIf } from 'class-validator';
import { transformers, PaginationDto } from '@nftfi.api/validation';
import { LoanV02Status, type LoanV02SortBy, type LoanV02SortDirection } from '../loan-v02.types';

export class LoanV02GetQueryDto extends PaginationDto {
  @Expose()
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  borrowerAddress: string;

  @Expose()
  @IsEthereumAddress()
  @IsOptional()
  @ApiProperty({ type: String, required: false })
  lenderAddress: string;

  @Expose()
  @Transform(transformers.toArrayOfStrings)
  @IsEthereumAddress({ each: true })
  @IsOptional()
  @ApiProperty({ type: [String], required: false })
  nftAddresses: string[];

  @Expose()
  @IsEnum(LoanV02Status)
  @ApiProperty({ enum: LoanV02Status, required: true })
  status: LoanV02Status;

  @Expose()
  @IsOptional()
  @IsIn(['repayment', 'interest', 'apr', 'duration', 'dueDate', 'nftName'])
  @Optional()
  @ApiProperty({ type: String, required: false })
  sortBy: LoanV02SortBy;

  @Expose()
  @IsIn(['asc', 'desc'])
  @ValidateIf((v: LoanV02GetQueryDto) => !!v.sortBy)
  @ApiProperty({ type: String, required: false })
  sortDirection: LoanV02SortDirection;
}
