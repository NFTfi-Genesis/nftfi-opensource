import { MailerController } from '../src/mailer/mailer.controller';
import { MailerService } from '../src/mailer/mailer.service';
import { buildEmailDto } from './factories/mailer.factory';

describe(MailerController.name, () => {
  let controller: MailerController;
  let mailerService: jest.Mocked<Pick<MailerService, 'create'>>;

  beforeEach(() => {
    mailerService = { create: jest.fn().mockResolvedValue(undefined) };
    controller = new MailerController(mailerService as unknown as MailerService);
  });

  describe(MailerController.prototype.handlePost.name, () => {
    it('delegates payload to mailer service', async () => {
      const payload = buildEmailDto();

      await controller.handlePost(payload);

      expect(mailerService.create).toHaveBeenCalledTimes(1);
      expect(mailerService.create).toHaveBeenCalledWith(payload);
    });
  });

  describe(MailerController.prototype.onEmail.name, () => {
    it('delegates event payload to mailer service', async () => {
      const payload = buildEmailDto();

      await controller.onEmail(payload);

      expect(mailerService.create).toHaveBeenCalledTimes(1);
      expect(mailerService.create).toHaveBeenCalledWith(payload);
    });
  });
});
