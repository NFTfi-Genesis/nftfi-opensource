import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { TransporterToken, TransportProvider } from '../src/mailer/transport.provider';

jest.mock('nodemailer');
jest.mock('nodemailer-sendgrid-transport');
jest.mock('nodemailer-express-handlebars', () => jest.fn().mockReturnValue(jest.fn()));

describe(TransporterToken, () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
  });

  it('initializes with sendgrid key if it exists', async () => {
    const fnUse = jest.fn() as nodemailer.Transporter['use'];
    const mockTransporter = { use: fnUse } as nodemailer.Transporter;
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter);
    const fnConfig = {
      get: jest.fn().mockReturnValue({
        transport: {
          sendgrid: { apiKey: 'test-api-key' },
          mailhog: { host: 'localhost', port: 1025 }
        },
        templates: { path: '/path/to/templates' }
      })
    };

    const result = await TransportProvider.useFactory(fnConfig);
    expect(result).toEqual(mockTransporter);
    expect(fnUse).toHaveBeenCalledWith('compile', expect.any(Function));
  });

  it('initializes with mailhog if sendgrid is missing', async () => {
    const fnUse = jest.fn() as nodemailer.Transporter['use'];
    const mockTransporter = { use: fnUse } as nodemailer.Transporter;
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter);
    const fnConfig = {
      get: jest.fn().mockReturnValue({
        transport: {
          sendgrid: { apiKey: undefined },
          mailhog: { host: 'localhost', port: 1025 }
        },
        templates: { path: '/path/to/templates' }
      })
    };

    const result = await TransportProvider.useFactory(fnConfig);
    expect(result).toEqual(mockTransporter);
    expect(fnUse).toHaveBeenCalledWith('compile', expect.any(Function));
  });
});
