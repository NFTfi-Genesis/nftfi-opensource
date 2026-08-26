import { of } from 'rxjs';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { ClientRMQ } from '@nestjs/microservices';
import { QueueFacade } from '../src/queue/queue.facade';

describe(QueueFacade.name, () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  describe(QueueFacade['registerClientProxy'].name, () => {
    it('should register client proxy with correct configuration', async () => {
      const configCallback = (configService: ConfigService): { urls: string[] } => ({
        urls: [configService.get<string>('queue.url')]
      });
      const moduleToken = 'QueueToken';

      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              (): object => ({
                queue: {
                  url: 'amqp://localhost:5672'
                }
              })
            ]
          }),
          QueueFacade['registerClientProxy'](configCallback, moduleToken, 'Queue')
        ],
        providers: []
      }).compile();

      expect(moduleRef.get(moduleToken)).toBeDefined();
    });
  });

  describe(QueueFacade.setupMicroservice.name, () => {
    it('should setup microservice with correct configuration', async () => {
      const configCallback = (configService: ConfigService): { urls: string[] } => ({
        urls: [configService.get<string>('queue.url')]
      });

      const app = {
        get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue('amqp://localhost:5672') }),
        connectMicroservice: jest.fn()
      } as unknown as INestApplication;

      QueueFacade.setupMicroservice(app, configCallback, 'Queue');

      expect(app.connectMicroservice).toHaveBeenCalledWith({
        transport: 5,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'Queue',
          persistent: true,
          queueOptions: { durable: true }
        }
      });
    });
  });

  describe(QueueFacade.prototype.onModuleInit.name, () => {
    it('connects to the queue on module initialization', async () => {
      const client = {
        connect: jest.fn().mockResolvedValue(undefined)
      } as unknown as ClientRMQ;
      const facade = new QueueFacade(client, { queue: 'Queue', caller: 'test-caller' });

      await facade.onModuleInit();
      expect(client.connect).toHaveBeenCalled();
    });
  });

  describe(QueueFacade.prototype['connectToQueue'].name, () => {
    it('should connect to the queue and retry on failure', async () => {
      const client = {
        connect: jest.fn().mockRejectedValueOnce(new Error('Error to connect')).mockResolvedValue(undefined)
      } as unknown as ClientRMQ;
      const facade = new QueueFacade(client, { queue: 'Queue', caller: 'test-caller' });
      const connectPromise = facade['connectToQueue'](client, 'test-queue');
      await Promise.resolve();

      await jest.advanceTimersByTimeAsync(1000);
      await connectPromise;

      expect(client.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe(QueueFacade.prototype['send'].name, () => {
    it('should send message with additional info', async () => {
      const client = {
        send: jest.fn().mockReturnValueOnce(of('response'))
      } as unknown as ClientRMQ;
      const facade = new QueueFacade(client, { queue: 'Queue', caller: 'test-caller' });

      const response = await facade['send']<{ foo: string }, string>('test-topic', { foo: 'bar' });

      expect(client.send).toHaveBeenCalledWith('test-topic', { foo: 'bar', caller: 'test-caller' });
      expect(response).toBe('response');
    });
  });

  describe(QueueFacade.prototype['emit'].name, () => {
    it('should emit message with additional info', async () => {
      const client = {
        emit: jest.fn().mockReturnValueOnce(of(undefined))
      } as unknown as ClientRMQ;
      const facade = new QueueFacade(client, { queue: 'Queue', caller: 'test-caller' });

      await facade['emit']<{ foo: string }>('test-topic', { foo: 'bar' });

      expect(client.emit).toHaveBeenCalledWith('test-topic', { foo: 'bar', caller: 'test-caller' });
    });

    it('should emit with default empty payload', async () => {
      const client = {
        emit: jest.fn().mockReturnValueOnce(of(undefined))
      } as unknown as ClientRMQ;
      const facade = new QueueFacade(client, { queue: 'Queue', caller: 'test-caller' });

      await facade['emit']('test-topic');

      expect(client.emit).toHaveBeenCalledWith('test-topic', { caller: 'test-caller' });
    });
  });
});
