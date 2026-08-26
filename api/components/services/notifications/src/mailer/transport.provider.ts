import path from 'path';
import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import sendgrid from 'nodemailer-sendgrid-transport';
import hbs from 'nodemailer-express-handlebars';
import { Config } from '../config';

export const TransporterToken = 'MailerTransporter';

export const TransportProvider: FactoryProvider = {
  provide: TransporterToken,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Transporter => {
    const logger = new Logger(TransporterToken);

    let transporter: Transporter;
    const config = configService.get<Config['mailer']>('mailer');
    if (config.transport.sendgrid.apiKey) {
      logger.log('Using sendgrid as email transport (Api Key exists)');

      const stransport = sendgrid({ auth: { api_key: config.transport.sendgrid.apiKey } });
      transporter = createTransport(stransport);
    } else {
      logger.log('Using internal email transport (Mailhog) (Api Key missing)');

      transporter = createTransport({
        host: config.transport.mailhog.host,
        port: config.transport.mailhog.port
      });
    }

    transporter.use(
      'compile',
      hbs({
        extName: '.hbs',
        viewPath: config.templates.path,
        viewEngine: {
          extname: '.hbs',
          defaultLayout: 'main',
          layoutsDir: config.templates.path,
          partialsDir: path.join(config.templates.path, 'partials'),
          helpers: {
            compactAddress: (address: string) => `${address.slice(0, 5)}...${address.slice(-3)}`,
            formatAPR: (apr: number) => `${apr.toFixed(2)}%`
          }
        }
      })
    );

    return transporter;
  }
};
