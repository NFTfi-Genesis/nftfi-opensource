import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum EmailAttachmentType {
  ICS = 'ics'
}

export class EmailAttachmentDto {
  @ApiProperty({ enum: EmailAttachmentType })
  @IsEnum(EmailAttachmentType)
  type: EmailAttachmentType;
}

export class EmailAttachmentICSDto extends EmailAttachmentDto {
  @ApiProperty({ type: Date })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({ type: Date })
  @Type(() => Date)
  @IsDate()
  end: Date;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  description: string;
}
