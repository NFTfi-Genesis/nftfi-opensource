import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equal, In } from 'typeorm';
import { Listing, ListingRepository, ListingPreference } from '@nftfi.api/repositories/postgres/listing';
import { createTypeormQueryBuilderMock, createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildListingEntity } from './listing.factory';

describe(ListingRepository.name, () => {
  let repository: ListingRepository;
  let model: MockTypeormRepository<Listing>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingRepository,
        {
          provide: getRepositoryToken(Listing),
          useValue: createTypeormRepositoryMock<Listing>({
            softDelete: jest.fn()
          } as never)
        }
      ]
    }).compile();

    repository = moduleRef.get(ListingRepository);
    model = moduleRef.get(getRepositoryToken(Listing));
  });

  describe(ListingRepository.prototype.create.name, () => {
    it('creates and saves a listing', async () => {
      const draft = {
        nftContract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
        nftTokenId: '7332',
        borrower: '0x5f79bd35435a7b98493543db0fec7f55292e9e77',
        duration: 604800,
        currency: null,
        prorated: null,
        preference: ListingPreference.LowApr,
        asset: { id: 1 }
      };
      const created = buildListingEntity(draft as never);
      model.create.mockReturnValue(created);
      model.save.mockResolvedValue(created);

      const result = await repository.create(draft as never);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.save).toHaveBeenCalledWith(created, { reload: true });
      expect(result).toBe(created);
    });
  });

  describe(ListingRepository.prototype.update.name, () => {
    it('updates and returns the listing', async () => {
      const listing = buildListingEntity();
      model.findOneOrFail.mockResolvedValue(listing);

      const result = await repository.update(1, { duration: 1209600 });

      expect(model.update).toHaveBeenCalledWith(1, { duration: 1209600 });
      expect(model.findOneOrFail).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(listing);
    });
  });

  describe(ListingRepository.prototype.softDelete.name, () => {
    it('sets deletedReason and deletedAt in a single atomic update', async () => {
      await repository.softDelete(1, 'USER_ACTION');

      expect(model.update).toHaveBeenCalledWith(1, {
        deletedReason: 'USER_ACTION',
        deletedAt: expect.any(Date)
      });
      expect(model.update).toHaveBeenCalledTimes(1);
    });
  });

  describe(ListingRepository.prototype.iterateAll.name, () => {
    it('iterates all active listings in batches', async () => {
      const l1 = buildListingEntity({ id: 1 });
      const l2 = buildListingEntity({ id: 2, nftTokenId: '2' });
      model.find.mockResolvedValueOnce([l1, l2]).mockResolvedValueOnce([]);

      const result: Listing[] = [];
      for await (const listing of repository.iterateAll()) {
        result.push(listing);
      }

      expect(result).toEqual([l1, l2]);
      expect(model.find).toHaveBeenNthCalledWith(1, {
        order: { id: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });

  describe(ListingRepository.prototype.findByAsset.name, () => {
    it('finds by contract and tokenId excluding soft-deleted', async () => {
      const listing = buildListingEntity();
      model.findOne.mockResolvedValue(listing);

      const result = await repository.findByAsset('0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', '7332');

      expect(model.findOne).toHaveBeenCalledWith({
        where: { nftContract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', nftTokenId: '7332' },
        withDeleted: false
      });
      expect(result).toBe(listing);
    });

    it('returns null when not found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await repository.findByAsset('0x0000000000000000000000000000000000000001', '1');

      expect(result).toBeNull();
    });
  });

  describe(ListingRepository.prototype.find.name, () => {
    it('builds query with no filters and default sort', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([buildListingEntity()]);

      const result = await repository.find({}, { skip: 0, limit: 50 });

      expect(model.createQueryBuilder).toHaveBeenCalledWith('listings');
      expect(qb.where).toHaveBeenCalledWith({});
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(qb.addOrderBy).toHaveBeenCalledWith('listings.createdAt', 'DESC', 'NULLS LAST');
      expect(result).toHaveLength(1);
    });

    it('applies borrower filter', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ borrower: '0xabc' }, { skip: 0, limit: 50 });

      expect(qb.where).toHaveBeenCalledWith({ borrower: Equal('0xabc') });
    });

    it('applies currency filter', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ currency: '0xweth' }, { skip: 0, limit: 50 });

      expect(qb.where).toHaveBeenCalledWith({ currency: Equal('0xweth') });
    });

    it('applies duration filter', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ duration: 604800 }, { skip: 0, limit: 50 });

      expect(qb.where).toHaveBeenCalledWith({ duration: Equal(604800) });
    });

    it('applies nftContracts filter', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ nftContracts: ['0xabc', '0xdef'] }, { skip: 0, limit: 50 });

      expect(qb.where).toHaveBeenCalledWith({ nftContract: In(['0xabc', '0xdef']) });
    });

    it('applies collectionIds filter with inner join', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find({ collectionIds: [1, 2] }, { skip: 0, limit: 50 });

      expect(qb.innerJoin).toHaveBeenCalledWith('collection_assets', 'assets', 'assets.id = listings.asset_id');
      expect(qb.andWhere).toHaveBeenCalledWith('assets.collection_id IN (:...collectionIds)', {
        collectionIds: [1, 2]
      });
    });

    it('applies multiple filters together', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      model.metadata.findColumnWithPropertyName.mockReturnValue({ propertyName: 'createdAt' });
      qb.getMany.mockResolvedValue([]);

      await repository.find(
        { borrower: '0xabc', duration: 604800 },
        { skip: 10, limit: 20, sort: { by: 'createdAt', direction: 'ASC' } }
      );

      expect(qb.where).toHaveBeenCalledWith({
        borrower: Equal('0xabc'),
        duration: Equal(604800)
      });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.addOrderBy).toHaveBeenCalledWith('listings.createdAt', 'ASC', 'NULLS LAST');
    });
  });

  describe(ListingRepository.prototype.count.name, () => {
    it('counts with no filters', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(5);

      const result = await repository.count({});

      expect(model.createQueryBuilder).toHaveBeenCalledWith('listings');
      expect(qb.where).toHaveBeenCalledWith({});
      expect(result).toBe(5);
    });

    it('counts with borrower filter', async () => {
      const qb = createTypeormQueryBuilderMock();
      model.createQueryBuilder.mockReturnValue(qb as never);
      qb.getCount.mockResolvedValue(2);

      const result = await repository.count({ borrower: '0xabc' });

      expect(qb.where).toHaveBeenCalledWith({ borrower: Equal('0xabc') });
      expect(result).toBe(2);
    });
  });
});
