import { INestApplication, Logger, ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as ics from 'ics';
import { Transporter } from 'nodemailer';
import { NotificationChannel, NotificationRepository } from '@nftfi.api/repositories/postgres/notification';
import { AttachmentType } from '../src/mailer/dtos';
import { MailerService } from '../src/mailer/mailer.service';
import { EmailComms } from '../src/mailer/mailer.types';
import { TransporterToken } from '../src/mailer/transport.provider';
import { buildEmailDto, buildICSAttachmentContent } from './factories/mailer.factory';

jest.mock('ics');

const buildEmailComms = (overrides: Partial<EmailComms> = {}): EmailComms =>
  ({
    id: 1,
    key: '123',
    channel: NotificationChannel.Email,
    sent: false,
    template: 'main',
    recipient: 'receiver@mailhog.local',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    context: {
      foo: 'bar',
      subject: 'Test email',
      logoUrl: 'https://nftfi.com/logo.png',
      nftfiUrl: 'https://nftfi.com',
      walletUrl: 'https://nftfi.com/wallet',
      twitterUrl: 'https://x.com/nftfi',
      discordUrl: 'https://discord.gg/nftfi',
      attachments: []
    },
    ...overrides
  } as EmailComms);

describe(MailerService.name, () => {
  let app: INestApplication;
  let service: MailerService;
  let notificationRepository: NotificationRepository;
  let transporter: Transporter;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              mailer: {
                from: 'test@mailhog.local'
              },
              nftfi: {
                static: {
                  logoUrl: 'https://nftfi.com/logo.png',
                  walletUrl: 'https://nftfi.com/wallet',
                  twitterUrl: 'https://x.com/nftfi',
                  discordUrl: 'https://discord.gg/nftfi'
                },
                dappUrl: 'https://nftfi.com'
              }
            })
          ]
        })
      ],
      providers: [
        MailerService,
        {
          provide: TransporterToken,
          useValue: {
            sendMail: jest.fn().mockResolvedValue({ messageId: '123' })
          }
        },
        {
          provide: NotificationRepository,
          useValue: {
            exists: jest.fn().mockResolvedValue(false),
            upsert: jest.fn(),
            markAsSent: jest.fn(),
            iterateOverPendingPerChannel: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    service = moduleRef.get(MailerService);
    notificationRepository = moduleRef.get(NotificationRepository);
    transporter = moduleRef.get(TransporterToken);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(MailerService.prototype.create.name, () => {
    it('creates pending comms with default context and ICS attachments', async () => {
      jest.spyOn(ics, 'createEvent').mockReturnValueOnce({
        error: null,
        value: buildICSAttachmentContent()
      });

      await service.create(
        buildEmailDto({
          attachments: [
            {
              type: 'PDF' as AttachmentType,
              start: new Date('2021-01-01T00:00:00Z'),
              end: new Date('2021-01-01T01:00:00Z'),
              title: 'Meeting',
              description: 'Meeting description'
            },
            {
              type: AttachmentType.ICS,
              start: new Date('2021-01-01T00:00:00Z'),
              end: new Date('2021-01-01T01:00:00Z'),
              title: 'Meeting',
              description: 'Meeting description'
            }
          ]
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
      expect(notificationRepository.upsert).toHaveBeenCalledWith({
        channel: NotificationChannel.Email,
        key: '123',
        template: 'main',
        recipient: 'receiver@mailhog.local',
        sent: false,
        context: {
          foo: 'bar',
          logoUrl: 'https://nftfi.com/logo.png',
          nftfiUrl: 'https://nftfi.com',
          walletUrl: 'https://nftfi.com/wallet',
          twitterUrl: 'https://x.com/nftfi',
          discordUrl: 'https://discord.gg/nftfi',
          subject: 'Test email',
          attachments: [
            {
              filename: 'invite.ics',
              contentType: 'text/calendar',
              content: buildICSAttachmentContent()
            }
          ]
        }
      });
    });

    it('throws conflict when comm already exists and resend is not requested', async () => {
      jest.spyOn(notificationRepository, 'exists').mockResolvedValueOnce(true);

      await expect(service.create(buildEmailDto())).rejects.toBeInstanceOf(ConflictException);
      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('allows create when resend option is enabled', async () => {
      jest.spyOn(notificationRepository, 'exists').mockResolvedValueOnce(true);

      await service.create(buildEmailDto({ options: { resend: true } }));

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('throws when ICS event creation fails', async () => {
      jest.spyOn(ics, 'createEvent').mockReturnValueOnce({ error: new Error('ics failed') });

      await expect(
        service.create(
          buildEmailDto({
            attachments: [
              {
                type: AttachmentType.ICS,
                start: new Date('2021-01-01T00:00:00Z'),
                end: new Date('2021-01-01T01:00:00Z'),
                title: 'Meeting',
                description: 'Meeting description'
              }
            ]
          })
        )
      ).rejects.toThrow('ics failed');
    });
  });

  describe(MailerService.prototype.send.name, () => {
    it('sends email and marks notification as sent', async () => {
      const comm = buildEmailComms();

      await service.send(comm);

      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: 'test@mailhog.local',
        to: comm.recipient,
        subject: 'Test email',
        template: 'main',
        attachments: comm.context.attachments,
        context: {
          foo: 'bar',
          logoUrl: 'https://nftfi.com/logo.png',
          nftfiUrl: 'https://nftfi.com',
          walletUrl: 'https://nftfi.com/wallet',
          twitterUrl: 'https://x.com/nftfi',
          discordUrl: 'https://discord.gg/nftfi'
        }
      });
      expect(notificationRepository.markAsSent).toHaveBeenCalledWith(comm);
    });

    it('does not mark as sent when sending throws', async () => {
      const comm = buildEmailComms();
      jest.spyOn(transporter, 'sendMail').mockRejectedValueOnce(new Error('send failure'));

      await expect(service.send(comm)).resolves.toBeUndefined();

      expect(notificationRepository.markAsSent).not.toHaveBeenCalled();
    });
  });

  describe(MailerService.prototype.sendPendingNotifications.name, () => {
    it('iterates pending notifications and suppresses send errors', async () => {
      const first = buildEmailComms({ id: 1 });
      const second = buildEmailComms({ id: 2 });
      jest.spyOn(notificationRepository, 'iterateOverPendingPerChannel').mockReturnValue(
        (async function* (): AsyncGenerator<EmailComms> {
          yield first;
          yield second;
        })() as unknown as ReturnType<NotificationRepository['iterateOverPendingPerChannel']>
      );
      jest.spyOn(service, 'send').mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('send error'));

      await expect(service.sendPendingNotifications()).resolves.toBeUndefined();

      expect(notificationRepository.iterateOverPendingPerChannel).toHaveBeenCalledWith(NotificationChannel.Email);
      expect(service.send).toHaveBeenCalledTimes(2);
      expect(service.send).toHaveBeenNthCalledWith(1, first);
      expect(service.send).toHaveBeenNthCalledWith(2, second);
    });
  });
});
