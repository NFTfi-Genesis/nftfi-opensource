import { CommandInteraction, GuildTextBasedChannel } from 'discord.js';
import { DiscordMessageDto, DiscordMessageType } from '../../src/discord-bot/dtos';

export const buildDto = (overrides: Partial<DiscordMessageDto> = {}): DiscordMessageDto => ({
  commsId: '123',
  context: {} as never,
  type: DiscordMessageType.NewListing,
  ...overrides
});

export const buildCommandEvent = (overrides: Partial<CommandInteraction> = {}): CommandInteraction =>
  ({
    reply: jest.fn(),
    channelId: '123',
    channel: { send: jest.fn() } as unknown as GuildTextBasedChannel,
    ...overrides
  } as unknown as CommandInteraction);
