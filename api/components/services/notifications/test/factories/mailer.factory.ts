import { EmailDto, Template } from '../../src/mailer/dtos';

export const buildEmailDto = (overrides?: Partial<EmailDto>): EmailDto => ({
  commsId: '123',
  to: 'receiver@mailhog.local',
  template: Template.Main,
  subject: 'Test email',
  context: { foo: 'bar' },
  ...overrides
});

export const buildICSAttachmentContent = (): string =>
  'BEGIN:VCALENDAR\r\n' +
  'VERSION:2.0\r\n' +
  'CALSCALE:GREGORIAN\r\n' +
  'PRODID:adamgibbons/ics\r\n' +
  'METHOD:PUBLISH\r\n' +
  'X-PUBLISHED-TTL:PT1H\r\n' +
  'BEGIN:VEVENT\r\n' +
  'UID:Lcq165TI92fBDRFDnvuTD\r\n' +
  'SUMMARY:Meeting\r\n' +
  'DTSTAMP:20240830T141711Z\r\n' +
  'DTSTART:20201231T230000Z\r\n' +
  'DTEND:20210101T000000Z\r\n' +
  'DESCRIPTION:Meeting description\r\n' +
  'BEGIN:VALARM\r\n' +
  'ACTION:AUDIO\r\n' +
  'REPEAT:2\r\n' +
  'DESCRIPTION:Reminder\r\n' +
  'ATTACH;VALUE=URI:Glass\r\n' +
  'TRIGGER:-PT2H\r\n' +
  'END:VALARM\r\n' +
  'BEGIN:VALARM\r\n' +
  'ACTION:AUDIO\r\n' +
  'REPEAT:2\r\n' +
  'DESCRIPTION:Reminder\r\n' +
  'ATTACH;VALUE=URI:Glass\r\n' +
  'TRIGGER:-PT24H\r\n' +
  'END:VALARM\r\n' +
  'END:VEVENT\r\n' +
  'END:VCALENDAR\r\n';
