import { Reflector } from '@nestjs/core';
import { Controller, Get } from '@nestjs/common';
import { AuthOptional, AUTHGUARD_OPTIONAL_KEY } from '../../src/auth-guard/decorators/auth-optional.decorator';

describe(AuthOptional.name, () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should set AUTHGUARD_OPTIONAL_KEY metadata to true when applied', () => {
    class TestController {
      @AuthOptional()
      @Get('/optional')
      optionalMethod(): string {
        return 'optional';
      }
    }

    const metadata = reflector.get(AUTHGUARD_OPTIONAL_KEY, TestController.prototype.optionalMethod);
    expect(metadata).toBe(true);
  });

  it('should not set metadata when decorator is not applied', () => {
    class TestController {
      @Get('/required')
      requiredMethod(): string {
        return 'required';
      }
    }

    const metadata = reflector.get(AUTHGUARD_OPTIONAL_KEY, TestController.prototype.requiredMethod);
    expect(metadata).toBeUndefined();
  });

  it('should work alongside other decorators on the same method', () => {
    @Controller('test')
    class TestController {
      @AuthOptional()
      @Get('/mixed')
      mixedMethod(): string {
        return 'mixed';
      }
    }

    const metadata = reflector.get(AUTHGUARD_OPTIONAL_KEY, TestController.prototype.mixedMethod);
    expect(metadata).toBe(true);
  });
});
