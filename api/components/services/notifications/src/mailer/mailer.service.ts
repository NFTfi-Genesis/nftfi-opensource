import { ConflictException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ics from 'ics';
import { format, sub } from 'date-fns';
import { isNil, omit } from 'lodash';
import { Transporter } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import { EmailAttachmentType, EmailAttachmentICSDto } from '@nftfi.api/facades/email-notifications';
import {
  NotificationChannel,
  NotificationRepository,
  type DraftNotification
} from '@nftfi.api/repositories/postgres/notification';
import { Config } from '../config';
import { EmailDto } from './dtos';
import { TransporterToken } from './transport.provider';
import { DefaultContext, EmailComms, SendMailOptions, ServiceConfig } from './mailer.types';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly config: ServiceConfig;
  constructor(
    @Inject(TransporterToken) private readonly transporter: Transporter,
    private readonly notificationRepository: NotificationRepository,
    configService: ConfigService
  ) {
    const mailerConfig = configService.get<Config['mailer']>('mailer');
    const nftfiConfig = configService.get<Config['nftfi']>('nftfi');
    this.config = {
      fromAddress: mailerConfig.from,
      nftfiLogoUrl: nftfiConfig.static.logoUrl,
      nftfiUrl: nftfiConfig.dappUrl,
      twitterUrl: nftfiConfig.static.twitterUrl,
      discordUrl: nftfiConfig.static.discordUrl,
      walletUrl: nftfiConfig.static.walletUrl
    };
  }

  async create({ commsId, template, to, subject, context, attachments, options }: EmailDto): Promise<void> {
    const exists = await this.notificationRepository.exists(commsId, template, to);
    if (exists && !options?.resend) {
      throw new ConflictException();
    }

    const auditPayload: DraftNotification = {
      channel: NotificationChannel.Email,
      key: commsId,
      template,
      recipient: to,
      sent: false,
      context: {
        ...this.getDefaultContext(),
        ...context,
        subject,
        attachments: (await this.getAttachments(attachments)).filter(v => !isNil(v))
      }
    };

    await this.notificationRepository.upsert(auditPayload);
    this.logger.log(`Email request created successfully: ${JSON.stringify(auditPayload)}`);
  }

  async sendPendingNotifications(): Promise<void> {
    for await (const comm of this.notificationRepository.iterateOverPendingPerChannel(NotificationChannel.Email)) {
      try {
        await this.send(comm as EmailComms);
      } catch {}
    }
  }

  async send(comms: EmailComms): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: this.config.fromAddress,
      to: comms.recipient,
      subject: comms.context.subject,
      template: comms.template,
      attachments: comms.context.attachments,
      context: omit(comms.context, ['subject', 'attachments'])
    };
    try {
      await this.transporter.sendMail(mailOptions);
      await this.notificationRepository.markAsSent(comms);
      this.logger.log(`Email sent successfully: ${JSON.stringify(mailOptions)}`);
    } catch (err) {
      this.logger.error(`Error sending email: ${JSON.stringify({ ...err, ...mailOptions })}`);
    }
  }

  private getDefaultContext(): DefaultContext {
    return {
      logoUrl: this.config.nftfiLogoUrl,
      nftfiUrl: this.config.nftfiUrl,
      walletUrl: this.config.walletUrl,
      twitterUrl: this.config.twitterUrl,
      discordUrl: this.config.discordUrl
    };
  }

  private async getAttachments(attachments: EmailDto['attachments'] = []): Promise<Attachment[]> {
    const promises = attachments.map<Promise<Attachment>>(async attachment => {
      if (attachment.type === EmailAttachmentType.ICS) {
        return {
          filename: 'invite.ics',
          contentType: 'text/calendar',
          content: await this.createICSAttachment(attachment)
        };
      }
      return null;
    });

    return Promise.all(promises);
  }

  private async createICSAttachment(attachment: EmailAttachmentICSDto): Promise<string> {
    const { start, end, title, description } = attachment;

    const formatDate = (date: Date): [number, number, number, number, number] =>
      format(sub(date, { hours: 1 }), 'yyyy,M,d,H,m')
        .split(',')
        .map(d => Number(d)) as [number, number, number, number, number];

    const icsEvent: ics.EventAttributes = {
      start: formatDate(start),
      end: formatDate(end),
      title,
      description,
      alarms: [
        {
          action: 'audio',
          description: 'Reminder',
          trigger: { hours: 2, before: true },
          repeat: 2,
          attachType: 'VALUE=URI',
          attach: 'Glass'
        },
        {
          action: 'audio',
          description: 'Reminder',
          trigger: { hours: 24, before: true },
          repeat: 2,
          attachType: 'VALUE=URI',
          attach: 'Glass'
        }
      ]
    };

    const event = ics.createEvent(icsEvent);
    if (event.error) {
      this.logger.error(`Error creating an ics event: ${event.error}`);
      throw new InternalServerErrorException(event.error);
    }

    return event.value;
  }
}
