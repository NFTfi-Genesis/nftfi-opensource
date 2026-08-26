import EventEmitter from 'events';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';

export enum HealthStatus {
  Shutdown = 'shutdown'
}

@Injectable()
export class HealthService implements OnApplicationShutdown {
  private readonly eventEmitter: EventEmitter = new EventEmitter();

  on(event: HealthStatus, listener: () => void | Promise<void>): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: HealthStatus, listener: () => void | Promise<void>): void {
    this.eventEmitter.off(event, listener);
  }

  onApplicationBootstrap(): void {
    this.eventEmitter.setMaxListeners(100);
  }

  onApplicationShutdown(): void {
    this.eventEmitter.emit(HealthStatus.Shutdown);
  }
}
