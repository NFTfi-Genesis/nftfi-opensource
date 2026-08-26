import childProcess from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import request from 'supertest';
import { HealthController } from '../../src/health/health.controller';

jest.mock('child_process');

describe(HealthController.name, () => {
  let app: INestApplication;
  let httpClient: AxiosInstance;

  const initApp = async (): Promise<void> => {
    httpClient = { get: jest.fn() } as unknown as AxiosInstance;
    jest.spyOn(axios, 'create').mockReturnValue(httpClient);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController]
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  };

  beforeEach(async () => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(HealthController.prototype.handleGet.name, () => {
    it('should return health status', async () => {
      jest.spyOn(childProcess, 'execSync').mockReturnValue('test-hash');
      await initApp();
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'OK',
        githash: 'test-hash'
      });
    });

    it('should return health status with unknown githash', async () => {
      jest.spyOn(childProcess, 'execSync').mockImplementation(() => {
        throw new Error('test-error');
      });
      await initApp();
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'OK',
        githash: 'unknown'
      });
    });
  });
});
