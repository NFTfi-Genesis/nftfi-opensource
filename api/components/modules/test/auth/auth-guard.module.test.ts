import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuardModule, AuthService } from '@nftfi.api/modules/auth-guard';
import { getModuleConfigFactoryProvider } from '../../src/auth-guard/auth.types';

describe('getModuleConfigFactoryProvider', () => {
  it('should return a FactoryProvider with the correct structure', () => {
    const factory = jest.fn().mockReturnValue({ secret: 'test-secret' });
    const result = getModuleConfigFactoryProvider({
      useFactory: factory,
      inject: [ConfigService]
    });

    expect(result).toEqual({
      provide: 'AuthModuleConfig',
      useFactory: factory,
      inject: [ConfigService]
    });
  });

  it('should work with empty inject array', () => {
    const factory = jest.fn().mockReturnValue({ secret: 's' });
    const result = getModuleConfigFactoryProvider({
      useFactory: factory,
      inject: []
    });

    expect(result).toEqual({
      provide: 'AuthModuleConfig',
      useFactory: factory,
      inject: []
    });
  });
});

describe(AuthGuardModule.name, () => {
  describe('forRootAsync', () => {
    it('should create a dynamic module with AuthService and JwtService', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AuthGuardModule.forRootAsync({
            useFactory: () => ({ secret: 'test-secret' }),
            inject: []
          })
        ]
      }).compile();

      const authService = moduleRef.get(AuthService);
      const jwtService = moduleRef.get(JwtService);

      expect(authService).toBeDefined();
      expect(jwtService).toBeDefined();
    });

    it('should inject dependencies into the factory', async () => {
      const factory = jest.fn().mockReturnValue({ secret: 'injected-secret' });

      const moduleRef = await Test.createTestingModule({
        imports: [
          AuthGuardModule.forRootAsync({
            useFactory: factory,
            inject: []
          })
        ]
      }).compile();

      expect(factory).toHaveBeenCalled();
      expect(moduleRef.get(AuthService)).toBeDefined();
    });
  });
});
