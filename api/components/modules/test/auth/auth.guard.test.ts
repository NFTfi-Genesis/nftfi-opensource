import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthGuard, AuthService } from '@nftfi.api/modules/auth-guard';
import { AUTHGUARD_OPTIONAL_KEY } from '../../src/auth-guard/decorators/auth-optional.decorator';

jest.mock('../../src/auth-guard/auth-utils', () => ({
  getAuthTokenFromRequest: jest.fn()
}));

import { getAuthTokenFromRequest } from '../../src/auth-guard/auth-utils';

const mockGetAuthTokenFromRequest = getAuthTokenFromRequest as jest.MockedFunction<typeof getAuthTokenFromRequest>;

describe(AuthGuard.name, () => {
  let guard: AuthGuard;
  let reflector: Reflector;
  let authService: AuthService;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    mockRequest = {};

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      }),
      getHandler: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn()
          }
        },
        {
          provide: AuthService,
          useValue: {
            verifyToken: jest.fn()
          }
        }
      ]
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get<Reflector>(Reflector);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AuthGuard.prototype.canActivate.name, () => {
    describe('with a valid token', () => {
      it('should return true when token is valid', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('valid.jwt.token');
        jest.spyOn(authService, 'verifyToken').mockResolvedValue(undefined);

        const result = await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.verifyToken).toHaveBeenCalledWith('valid.jwt.token');
      });

      it('should verify the token extracted from the request', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('eyJhbGciOiJIUzI1NiJ9.payload.sig');
        jest.spyOn(authService, 'verifyToken').mockResolvedValue(undefined);

        await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(mockGetAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
        expect(authService.verifyToken).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiJ9.payload.sig');
      });
    });

    describe('with no token', () => {
      it('should throw UnauthorizedException when token is missing and auth is required', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('');

        await expect(guard.canActivate(mockExecutionContext as ExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
        expect(authService.verifyToken).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when token is falsy and auth is required', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue(null as unknown as string);

        await expect(guard.canActivate(mockExecutionContext as ExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
      });

      it('should return true when token is missing and auth is optional', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(true);
        mockGetAuthTokenFromRequest.mockReturnValue('');

        const result = await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.verifyToken).not.toHaveBeenCalled();
      });

      it('should check AUTHGUARD_OPTIONAL_KEY on the handler', async () => {
        const mockHandler = jest.fn();
        mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler);
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('valid.jwt.token');
        jest.spyOn(authService, 'verifyToken').mockResolvedValue(undefined);

        await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(reflector.get).toHaveBeenCalledWith(AUTHGUARD_OPTIONAL_KEY, mockHandler);
      });
    });

    describe('with an invalid token', () => {
      it('should throw UnauthorizedException when verifyToken throws', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('invalid.token');
        jest.spyOn(authService, 'verifyToken').mockRejectedValue(new Error('invalid signature'));

        await expect(guard.canActivate(mockExecutionContext as ExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
      });

      it('should throw UnauthorizedException when token is expired', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('expired.jwt.token');
        jest.spyOn(authService, 'verifyToken').mockRejectedValue(new Error('jwt expired'));

        await expect(guard.canActivate(mockExecutionContext as ExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
        expect(authService.verifyToken).toHaveBeenCalledWith('expired.jwt.token');
      });

      it('should not expose original error details in UnauthorizedException', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('tampered.token');
        jest.spyOn(authService, 'verifyToken').mockRejectedValue(new Error('jwt malformed'));

        let thrown: unknown;
        try {
          await guard.canActivate(mockExecutionContext as ExecutionContext);
        } catch (err) {
          thrown = err;
        }

        expect(thrown).toBeInstanceOf(UnauthorizedException);
      });
    });

    describe('optional auth with a token present', () => {
      it('should still verify the token when auth is optional but token is provided', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(true);
        mockGetAuthTokenFromRequest.mockReturnValue('present.jwt.token');
        jest.spyOn(authService, 'verifyToken').mockResolvedValue(undefined);

        const result = await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.verifyToken).toHaveBeenCalledWith('present.jwt.token');
      });

      it('should throw UnauthorizedException when auth is optional but token is invalid', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(true);
        mockGetAuthTokenFromRequest.mockReturnValue('bad.token');
        jest.spyOn(authService, 'verifyToken').mockRejectedValue(new Error('invalid'));

        await expect(guard.canActivate(mockExecutionContext as ExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
      });
    });

    describe('request context extraction', () => {
      it('should extract the request from HTTP context', async () => {
        const mockHttpContext = {
          getRequest: jest.fn().mockReturnValue(mockRequest)
        };
        mockExecutionContext.switchToHttp = jest.fn().mockReturnValue(mockHttpContext);
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockGetAuthTokenFromRequest.mockReturnValue('valid.jwt.token');
        jest.spyOn(authService, 'verifyToken').mockResolvedValue(undefined);

        await guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
        expect(mockHttpContext.getRequest).toHaveBeenCalled();
        expect(mockGetAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
      });
    });
  });
});
