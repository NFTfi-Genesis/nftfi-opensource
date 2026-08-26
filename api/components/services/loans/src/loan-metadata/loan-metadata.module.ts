import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftfiSmartNftId, NftfiSmartNftIdRepository } from '@nftfi.api/repositories/postgres/nftfi-smart-nft-id';

import { LoanMetadataController } from './loan-metadata.controller';
import { LoanMetadataService } from './loan-metadata.service';

@Module({
  imports: [TypeOrmModule.forFeature([NftfiSmartNftId])],
  controllers: [LoanMetadataController],
  providers: [LoanMetadataService, NftfiSmartNftIdRepository]
})
export class LoanMetadataModule {}
