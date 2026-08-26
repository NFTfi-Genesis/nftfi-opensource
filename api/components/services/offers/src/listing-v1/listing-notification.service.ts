import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetDto } from '@nftfi.api/facades/assets';
import { DiscordNotificationsFacade, DiscordMessageType } from '@nftfi.api/facades/discord-notifications';
import { Config } from '../config';

@Injectable()
export class ListingNotificationService {
  constructor(
    private readonly discordFacade: DiscordNotificationsFacade,
    private readonly configService: ConfigService
  ) {}

  async notifyNewListing(nftContract: string, nftTokenId: string, asset: AssetDto): Promise<void> {
    const nftfiUrl = this.configService.get<Config['dapp']['url']>('dapp.url');
    this.discordFacade
      .sendMessage({
        commsId: `listing-${nftContract}:${nftTokenId}`,
        type: DiscordMessageType.NewListing,
        context: {
          assetUrl: `${nftfiUrl}/assets/${nftContract}/${nftTokenId}`,
          nftCollateralContract: nftContract,
          nftCollateralId: nftTokenId,
          assetCategory: asset.collection.name,
          assetName: asset.name,
          imageUrl: asset.imageMediumUrl
        },
        options: { resend: true }
      })
      .catch(() => void 0);
  }
}
