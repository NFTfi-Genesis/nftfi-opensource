import { TemplateOptions } from 'nodemailer-express-handlebars';
import Mail from 'nodemailer/lib/mailer';
import { Notification } from '@nftfi.api/repositories/postgres/notification';

export type SendMailOptions = Mail.Options & TemplateOptions;

export interface ServiceConfig {
  fromAddress: string;
  nftfiLogoUrl: string;
  nftfiUrl: string;
  twitterUrl: string;
  discordUrl: string;
  walletUrl: string;
}

export interface DefaultContext {
  logoUrl: string;
  nftfiUrl: string;
  twitterUrl: string;
  discordUrl: string;
  walletUrl: string;
}

export type EmailComms = Notification<{ subject: string; attachments?: object[] }>;
