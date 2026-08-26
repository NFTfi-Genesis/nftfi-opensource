import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ExecutionContext, Injectable, NotFoundException, PipeTransform, createParamDecorator } from '@nestjs/common';
import { Listing, ListingRepository } from '@nftfi.api/repositories/postgres/listing';

export class ListingPipeParams {
  @Expose()
  @IsString()
  @IsOptional()
  nftContract?: string;

  @Expose()
  @IsString()
  @IsOptional()
  nftTokenId?: string;
}

export const ListingParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ListingPipeParams => ctx.switchToHttp().getRequest().params
);

@Injectable()
export class ListingPipe implements PipeTransform {
  constructor(private readonly listingRepository: ListingRepository) {}

  async transform(params: ListingPipeParams): Promise<Listing> {
    if (!params.nftContract || !params.nftTokenId) {
      throw new NotFoundException('nftContract and nftTokenId are required');
    }
    const listing = await this.listingRepository.findByAsset(params.nftContract.toLowerCase(), params.nftTokenId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }
}
