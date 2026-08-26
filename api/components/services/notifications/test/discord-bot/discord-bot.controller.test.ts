import { DiscordBotController } from '../../src/discord-bot/discord-bot.controller';
import { DiscordBotService } from '../../src/discord-bot/discord-bot.service';
import { buildDto } from '../factories/discord-bot.factory';

describe(DiscordBotController.name, () => {
  let controller: DiscordBotController;
  let discordBotService: jest.Mocked<Pick<DiscordBotService, 'create'>>;

  beforeEach(() => {
    discordBotService = { create: jest.fn().mockResolvedValue(undefined) };
    controller = new DiscordBotController(discordBotService as unknown as DiscordBotService);
  });

  describe(DiscordBotController.prototype.handlePost.name, () => {
    it('delegates payload to service', async () => {
      const payload = buildDto();

      await controller.handlePost(payload);

      expect(discordBotService.create).toHaveBeenCalledTimes(1);
      expect(discordBotService.create).toHaveBeenCalledWith(payload);
    });
  });

  describe(DiscordBotController.prototype.onMessage.name, () => {
    it('delegates event payload to service', async () => {
      const payload = buildDto();

      await controller.onMessage(payload);

      expect(discordBotService.create).toHaveBeenCalledTimes(1);
      expect(discordBotService.create).toHaveBeenCalledWith(payload);
    });
  });
});
