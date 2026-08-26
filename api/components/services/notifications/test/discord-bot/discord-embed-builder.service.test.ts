import {
  DiscordMessageLoanContextDto,
  DiscordMessageNewListingContextDto
} from '@nftfi.api/facades/discord-notifications/discord-message-context.dto';
import { DiscordMessageType } from '@nftfi.api/facades/discord-notifications';
import { DiscordEmbedBuilderService } from '../../src/discord-bot/discord-embed-builder.service';

const buildNewListingContext = (
  overrides: Partial<DiscordMessageNewListingContextDto> = {}
): DiscordMessageNewListingContextDto => ({
  assetUrl: 'https://nftfi.com/loan/1',
  nftCollateralContract: '0xdd2b96f0e708f2de5af69cbad82824330ac182ee',
  nftCollateralId: '1',
  imageUrl: 'https://nftfi.com/image.jpg',
  assetCategory: 'Art',
  assetName: 'Artwork',
  ...overrides
});

const buildLoanContext = (overrides: Partial<DiscordMessageLoanContextDto> = {}): DiscordMessageLoanContextDto => ({
  assetUrl: 'https://nftfi.com/loan/1',
  nftCollateralContract: '0xdd2b96f0e708f2de5af69cbad82824330ac182ee',
  nftCollateralId: '1',
  imagePreviewUrl: 'https://nftfi.com/preview.jpg',
  principal: 10,
  repayment: 12,
  durationDays: 30,
  currency: { ticker: 'ETH' },
  assetCategory: 'Art',
  assetName: 'Artwork',
  ...overrides
});

describe(DiscordEmbedBuilderService.name, () => {
  let service: DiscordEmbedBuilderService;

  beforeEach(() => {
    service = new DiscordEmbedBuilderService();
  });

  describe(DiscordEmbedBuilderService.prototype.getBuilderByType.name, () => {
    it('returns undefined for unknown type', () => {
      const builder = service.getBuilderByType('unknown' as unknown as DiscordMessageType);
      expect(builder).toBeUndefined();
    });

    it('builds NewListing embed', () => {
      const builder = service.getBuilderByType(DiscordMessageType.NewListing);
      const embed = builder(buildNewListingContext()).toJSON();

      expect(embed.title).toBe('New Listing!');
      expect(embed.url).toBe('https://nftfi.com/loan/1');
      expect(embed.description).toBe('Art : Artwork\r\n\r\n**[Make an offer](https://nftfi.com/loan/1)**');
      expect(embed.image?.url).toBe('https://nftfi.com/image.jpg');
      expect(embed.color).toBe(3735462);
    });

    it('builds NewListing embed when category and name are missing', () => {
      const builder = service.getBuilderByType(DiscordMessageType.NewListing);
      const embed = builder(buildNewListingContext({ assetCategory: undefined, assetName: undefined })).toJSON();

      expect(embed.description).toBe('\r\n\r\n**[Make an offer](https://nftfi.com/loan/1)**');
    });

    it('builds NewOffer embed', () => {
      const builder = service.getBuilderByType(DiscordMessageType.NewOffer);
      const embed = builder(buildLoanContext()).toJSON();

      expect(embed.title).toBe('New Offer');
      expect(embed.url).toBe('https://nftfi.com/loan/1');
      expect(embed.thumbnail?.url).toBe('https://nftfi.com/preview.jpg');
      expect(embed.description).toBe('Art : Artwork\r\n\r\n**[Make an offer](https://nftfi.com/loan/1)**');
      expect(embed.fields).toEqual([
        { name: 'Loan', value: '10 ETH', inline: true },
        { name: 'Repayment', value: '12 ETH', inline: true },
        { name: 'Duration', value: '30 Days', inline: true }
      ]);
      expect(embed.color).toBe(3866623);
    });

    it('builds LoanStarted embed', () => {
      const builder = service.getBuilderByType(DiscordMessageType.LoanStarted);
      const embed = builder(buildLoanContext()).toJSON();

      expect(embed.title).toBe('New Loan Started');
      expect(embed.url).toBe('https://nftfi.com/loan/1');
      expect(embed.thumbnail?.url).toBe('https://nftfi.com/preview.jpg');
      expect(embed.description).toBe('Art : Artwork');
      expect(embed.timestamp).toBeDefined();
      expect(embed.fields).toHaveLength(3);
      expect(embed.color).toBe(14477161);
    });

    it('builds LoanRepaid embed', () => {
      const builder = service.getBuilderByType(DiscordMessageType.LoanRepaid);
      const embed = builder(buildLoanContext()).toJSON();

      expect(embed.title).toBe('Loan Repaid!');
      expect(embed.url).toBe('https://nftfi.com/loan/1');
      expect(embed.thumbnail?.url).toBe('https://nftfi.com/preview.jpg');
      expect(embed.description).toBe('Art : Artwork');
      expect(embed.timestamp).toBeDefined();
      expect(embed.fields).toHaveLength(3);
      expect(embed.color).toBe(3735462);
    });

    it('builds LoanLiquidated embed', () => {
      const builder = service.getBuilderByType(DiscordMessageType.LoanLiquidated);
      const embed = builder(buildLoanContext()).toJSON();

      expect(embed.title).toBe('Loan Liquidated');
      expect(embed.url).toBe('https://nftfi.com/loan/1');
      expect(embed.thumbnail?.url).toBe('https://nftfi.com/preview.jpg');
      expect(embed.description).toBe('Art : Artwork');
      expect(embed.timestamp).toBeDefined();
      expect(embed.fields).toHaveLength(3);
      expect(embed.color).toBe(16732618);
    });
  });
});
