import { execSync } from 'child_process';
import { Controller, Get, HttpCode, Logger, OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('health')
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger(HealthController.name);
  private githash = 'unknown';

  onModuleInit(): void {
    try {
      const revision = execSync('git rev-parse HEAD').toString().trim();
      if (revision) {
        this.githash = revision;
        this.logger.log(`Git revision: ${this.githash}`);
      }
    } catch (error) {
      // suppress error without throwing
      this.logger.warn('Could not determine Git revision: ' + error.message);
    }
  }

  @Get('/health')
  @HttpCode(200)
  handleGet(): { status: 'OK'; githash: string } {
    return { status: 'OK', githash: this.githash };
  }
}
