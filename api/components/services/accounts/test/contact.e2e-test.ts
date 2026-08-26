import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { AccountRepository } from '@nftfi.api/repositories/postgres/account';
import { AuthGuard, AuthParamGuard, AuthService } from '@nftfi.api/modules/auth-guard';
import { ChainalysisFacade } from '@nftfi.api/facades/chainalysis';
import { ContactV1Controller } from '../src/account/contact-v1.controller';
import { ContactService } from '../src/account/contact.service';
import { AccountService } from '../src/account/account.service';
import { AccountPipe } from '../src/account/account.pipe';
import { AccountContactPipe } from '../src/account/account-contact.pipe';
import { buildAccountContact, buildDraftContact, buildAccount } from './factories';

describe(`${ContactV1Controller.name} (e2e)`, () => {
  let app: INestApplication;
  let accountRepository: jest.Mocked<AccountRepository>;
  const address = '0x1234567890123456789012345678901234567890';
  const testDate = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(async () => {
    const mockAccountRepository = {
      findByWallet: jest.fn(),
      addContact: jest.fn(),
      updateContact: jest.fn(),
      deleteContact: jest.fn()
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ContactV1Controller],
      providers: [
        ContactService,
        AccountService,
        AccountPipe,
        AccountContactPipe,
        Reflector,
        {
          provide: AccountRepository,
          useValue: mockAccountRepository
        },
        {
          provide: ChainalysisFacade,
          useValue: { getIdentifications: jest.fn().mockResolvedValue([]) }
        },
        {
          provide: AuthService,
          useValue: {
            verifyToken: jest.fn().mockResolvedValue({ account: address }),
            isTokenOwner: jest.fn().mockReturnValue(true)
          }
        }
      ]
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthParamGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    accountRepository = moduleFixture.get(AccountRepository);
    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  describe('GET /v1/accounts/:address/contacts', () => {
    it('should return empty array when account has no contacts', async () => {
      const account = buildAccount({ wallet: address, contacts: [] });
      accountRepository.findByWallet.mockResolvedValue(account);

      const response = await request(app.getHttpServer()).get(`/v1/accounts/${address}/contacts`).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return contacts when account has contacts', async () => {
      const contacts = [
        buildAccountContact({
          id: 1,
          name: 'John Doe',
          wallets: ['0xaaaa000000000000000000000000000000000000'],
          favourited: false,
          createdAt: testDate
        }),
        buildAccountContact({
          id: 2,
          name: 'Jane Smith',
          wallets: ['0xbbbb000000000000000000000000000000000000'],
          favourited: true,
          createdAt: testDate
        })
      ];
      const account = buildAccount({ wallet: address, contacts });
      accountRepository.findByWallet.mockResolvedValue(account);

      const response = await request(app.getHttpServer()).get(`/v1/accounts/${address}/contacts`).expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe(1);
      expect(response.body[0].name).toBe('John Doe');
      expect(response.body[1].id).toBe(2);
      expect(response.body[1].name).toBe('Jane Smith');
    });

    it('should return 404 when account is not found', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer()).get(`/v1/accounts/${address}/contacts`).expect(404);
    });
  });

  describe('POST /v1/accounts/:address/contacts', () => {
    it('should create a new contact successfully', async () => {
      const draftContact = buildDraftContact({
        name: 'New Contact',
        wallets: ['0xaBcDef1234567890123456789012345678901234']
      });
      const mockAccount = buildAccount({ wallet: address });
      const mockContact = buildAccountContact({
        id: 7,
        name: 'New Contact',
        wallets: ['0xaBcDef1234567890123456789012345678901234'],
        createdAt: testDate
      });

      accountRepository.findByWallet.mockResolvedValue(mockAccount);
      accountRepository.addContact.mockResolvedValue(mockContact);

      const response = await request(app.getHttpServer())
        .post(`/v1/accounts/${address}/contacts`)
        .send(draftContact)
        .expect(201);

      expect(response.body.id).toBe(7);
      expect(response.body.name).toBe('New Contact');
      expect(accountRepository.addContact).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({
          name: 'New Contact'
        })
      );
    });

    it('should return 404 when account is not found', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer()).post(`/v1/accounts/${address}/contacts`).send(buildDraftContact()).expect(404);

      expect(accountRepository.addContact).not.toHaveBeenCalled();
    });
  });

  describe('PUT /v1/accounts/:address/contacts/:contactId', () => {
    const contactId = 5;

    it('should update contact successfully', async () => {
      const draftContact = buildDraftContact({
        name: 'Updated Contact',
        wallets: ['0x1234567890123456789012345678901234567890']
      });
      const existingContact = buildAccountContact({ id: contactId, createdAt: testDate });
      const account = buildAccount({ wallet: address, contacts: [existingContact] });
      const updatedContact = buildAccountContact({
        id: contactId,
        name: 'Updated Contact',
        wallets: ['0x1234567890123456789012345678901234567890'],
        createdAt: testDate
      });

      accountRepository.findByWallet.mockResolvedValue(account);
      accountRepository.updateContact.mockResolvedValue(updatedContact);

      const response = await request(app.getHttpServer())
        .put(`/v1/accounts/${address}/contacts/${contactId}`)
        .send(draftContact)
        .expect(200);

      expect(response.body.id).toBe(5);
      expect(response.body.name).toBe('Updated Contact');
      expect(accountRepository.updateContact).toHaveBeenCalledWith(
        account,
        existingContact,
        expect.objectContaining({
          name: 'Updated Contact'
        })
      );
    });

    it('should return 404 when account is not found', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put(`/v1/accounts/${address}/contacts/${contactId}`)
        .send(buildDraftContact())
        .expect(404);

      expect(accountRepository.updateContact).not.toHaveBeenCalled();
    });

    it('should return 404 when contact is not found', async () => {
      const account = buildAccount({
        wallet: address,
        contacts: [buildAccountContact({ id: 999 })]
      });
      accountRepository.findByWallet.mockResolvedValue(account);

      await request(app.getHttpServer())
        .put(`/v1/accounts/${address}/contacts/${contactId}`)
        .send(buildDraftContact())
        .expect(404);

      expect(accountRepository.updateContact).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /v1/accounts/:address/contacts/:contactId', () => {
    const contactId = 5;

    it('should delete contact successfully', async () => {
      const existingContact = buildAccountContact({ id: contactId, createdAt: testDate });
      const account = buildAccount({ wallet: address, contacts: [existingContact] });

      accountRepository.findByWallet.mockResolvedValue(account);
      accountRepository.deleteContact.mockResolvedValue(undefined);

      await request(app.getHttpServer()).delete(`/v1/accounts/${address}/contacts/${contactId}`).expect(204);

      expect(accountRepository.deleteContact).toHaveBeenCalledWith(account, existingContact);
    });

    it('should return 404 when account is not found', async () => {
      accountRepository.findByWallet.mockResolvedValue(null);

      await request(app.getHttpServer()).delete(`/v1/accounts/${address}/contacts/${contactId}`).expect(404);

      expect(accountRepository.deleteContact).not.toHaveBeenCalled();
    });

    it('should return 404 when contact is not found', async () => {
      const account = buildAccount({
        wallet: address,
        contacts: [buildAccountContact({ id: 999 })]
      });
      accountRepository.findByWallet.mockResolvedValue(account);

      await request(app.getHttpServer()).delete(`/v1/accounts/${address}/contacts/${contactId}`).expect(404);

      expect(accountRepository.deleteContact).not.toHaveBeenCalled();
    });
  });
});
