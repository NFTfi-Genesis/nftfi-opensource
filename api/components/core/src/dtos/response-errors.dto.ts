import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export type Errors = { [key: string]: string[] };

export class ResponseErrorsDto {
  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } })
  errors: Errors;
}
