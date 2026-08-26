import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  EmailAttachmentType,
  EmailAttachmentDto,
  EmailAttachmentICSDto,
  EmailTemplate
} from '@nftfi.api/facades/email-notifications';
import { EmailIOptions } from './email-options.dto';

@ApiExtraModels(EmailAttachmentICSDto)
export class EmailDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  commsId: string;

  @Expose()
  @IsEmail()
  @ApiProperty({ type: String })
  to: string;

  @Expose()
  @IsEnum(EmailTemplate)
  @ApiProperty({ type: String, example: 'main' })
  template: EmailTemplate;

  @Expose()
  @IsString()
  @ApiProperty({ type: String })
  subject: string;

  @Expose()
  @IsObject()
  @ApiProperty({ type: Object })
  context: Record<string, string>;

  @Expose()
  @Type(() => EmailAttachmentDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [{ value: EmailAttachmentICSDto, name: EmailAttachmentType.ICS }]
    }
  })
  @ValidateNested({ each: true })
  @IsOptional()
  @IsObject({ each: true })
  @ApiProperty({ type: 'array', oneOf: [{ $ref: getSchemaPath(EmailAttachmentICSDto) }] })
  attachments?: EmailAttachmentICSDto[];

  @Expose()
  @Type(() => EmailIOptions)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: EmailIOptions })
  options?: EmailIOptions;
}
