import EventEmitter from 'events';
import { HealthService, HealthStatus } from '../../src/health/health.service';

describe(HealthService.name, () => {
  let service: HealthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new HealthService();
  });

  describe(HealthService.prototype.onApplicationBootstrap.name, () => {
    it('sets max listeners to 100', () => {
      const fnSetMaxListeners = jest.spyOn(EventEmitter.prototype, 'setMaxListeners');

      service.onApplicationBootstrap();

      expect(fnSetMaxListeners).toHaveBeenCalledTimes(1);
      expect(fnSetMaxListeners).toHaveBeenCalledWith(100);
    });
  });

  describe(HealthService.prototype.onApplicationShutdown.name, () => {
    it('emits shutdown event', () => {
      const listener = jest.fn();
      service.on(HealthStatus.Shutdown, listener);

      service.onApplicationShutdown();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe(HealthService.prototype.off.name, () => {
    it('removes subscribed listener', () => {
      const listener = jest.fn();
      service.on(HealthStatus.Shutdown, listener);
      service.off(HealthStatus.Shutdown, listener);

      service.onApplicationShutdown();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
