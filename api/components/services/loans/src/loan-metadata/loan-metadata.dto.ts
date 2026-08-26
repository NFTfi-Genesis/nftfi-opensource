import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoanMetadataAttributeDto {
  @ApiProperty({ type: String, example: 'Amount Borrowed' })
  trait_type: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'number' }], example: '10.5 WETH' })
  value: string | number;

  @ApiPropertyOptional({ type: String, example: 'date' })
  display_type?: string;
}

export class LoanMetadataDto {
  @ApiProperty({ type: String, example: 'NFTfi Loan #42' })
  name: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: String })
  image: string;

  @ApiProperty({ type: String })
  external_url: string;

  @ApiPropertyOptional({ type: [LoanMetadataAttributeDto] })
  attributes?: LoanMetadataAttributeDto[];
}
