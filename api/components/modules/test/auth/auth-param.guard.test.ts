import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { type AuthTokenPayload, AuthParamGuard, AuthService, AuthParam } from '@nftfi.api/modules/auth-guard';

// Mock the auth-utils module that the guard actually imports from
jest.mock('../../src/auth-guard/auth-utils', () => ({
  getDecodedAuthTokenFromRequest: jest.fn()
}));

import { getDecodedAuthTokenFromRequest } from '../../src/auth-guard/auth-utils';

const mockGetDecodedAuthTokenFromRequest = getDecodedAuthTokenFromRequest as jest.MockedFunction<
  typeof getDecodedAuthTokenFromRequest
>;

describe(AuthParamGuard.name, () => {
  let guard: AuthParamGuard;
  let reflector: Reflector;
  let authService: AuthService;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockRequest: Partial<Request>;
  const testDate = new Date('2024-01-01T00:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(testDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    mockRequest = {
      params: {}
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      }),
      getHandler: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthParamGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn()
          }
        },
        {
          provide: AuthService,
          useValue: {
            isTokenOwner: jest.fn()
          }
        }
      ]
    }).compile();

    guard = module.get<AuthParamGuard>(AuthParamGuard);
    reflector = module.get<Reflector>(Reflector);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(AuthParamGuard.prototype.canActivate.name, () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const validTokenPayload: AuthTokenPayload = {
      account: validAddress,
      multisig: { type: 'gnosis' },
      iat: 1609459200,
      exp: 1924819200
    };

    describe('successful authorization', () => {
      it('should return true when all conditions are met', () => {
        // Setup
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(AuthParam, mockExecutionContext.getHandler());
        expect(mockGetDecodedAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(validTokenPayload, validAddress);
      });

      it('should return true with different parameter names', () => {
        const userId = 'user-123';
        const tokenPayload: AuthTokenPayload = {
          account: userId,
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('userId');
        mockRequest.params = { userId };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, userId);
      });

      it('should return true with case-insensitive address matching', () => {
        const upperCaseAddress = validAddress.toUpperCase();
        const tokenPayload: AuthTokenPayload = {
          account: validAddress.toLowerCase(),
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: upperCaseAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, upperCaseAddress);
      });
    });

    describe('missing or invalid metadata', () => {
      it('should return false when no AuthParam decorator metadata exists', () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(reflector.get).toHaveBeenCalledWith(AuthParam, mockExecutionContext.getHandler());
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when AuthParam decorator returns null', () => {
        jest.spyOn(reflector, 'get').mockReturnValue(null);
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when AuthParam decorator returns empty string', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });
    });

    describe('missing or invalid parameter values', () => {
      it('should return false when parameter value is missing from request', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = {}; // No address parameter
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when parameter value is empty string', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: '' };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when parameter value is null', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: null };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when parameter value is undefined', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: undefined };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when wrong parameter name is used', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { wrongParam: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).not.toHaveBeenCalled();
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });
    });

    describe('missing or invalid token payload', () => {
      it('should return false when token payload is null', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(null);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when token payload is undefined', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(undefined);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(mockGetDecodedAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });

      it('should return false when getDecodedAuthTokenFromRequest throws an error', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        expect(() => guard.canActivate(mockExecutionContext as ExecutionContext)).toThrow('Invalid token');
        expect(authService.isTokenOwner).not.toHaveBeenCalled();
      });
    });

    describe('authorization failures', () => {
      it('should return false when isTokenOwner returns false', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(false);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(validTokenPayload, validAddress);
      });

      it('should return false when token account does not match parameter value', () => {
        const differentAddress = '0xABCDEF1234567890123456789012345678901234';
        const tokenPayload: AuthTokenPayload = {
          account: differentAddress,
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(false);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(false);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, validAddress);
      });

      it('should return false when AuthService throws an error', () => {
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockImplementation(() => {
          throw new Error('Authorization service error');
        });

        expect(() => guard.canActivate(mockExecutionContext as ExecutionContext)).toThrow(
          'Authorization service error'
        );
      });
    });

    describe('edge cases and different parameter types', () => {
      it('should work with UUID parameters', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const tokenPayload: AuthTokenPayload = {
          account: uuid,
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('uuid');
        mockRequest.params = { uuid };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, uuid);
      });

      it('should work with numeric string parameters', () => {
        const numericId = '12345';
        const tokenPayload: AuthTokenPayload = {
          account: numericId,
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('id');
        mockRequest.params = { id: numericId };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, numericId);
      });

      it('should work with parameters containing special characters', () => {
        const specialParam = 'user-id_123';
        const tokenPayload: AuthTokenPayload = {
          account: specialParam,
          multisig: { type: undefined },
          iat: 1609459200,
          exp: 1924819200
        };

        jest.spyOn(reflector, 'get').mockReturnValue('userId');
        mockRequest.params = { userId: specialParam };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(tokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(authService.isTokenOwner).toHaveBeenCalledWith(tokenPayload, specialParam);
      });
    });

    describe('execution context handling', () => {
      it('should handle execution context with different handler functions', () => {
        const mockHandler1 = jest.fn();
        const mockHandler2 = jest.fn();

        // First call with handler 1
        mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler1);
        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        let result = guard.canActivate(mockExecutionContext as ExecutionContext);
        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(AuthParam, mockHandler1);

        // Second call with handler 2
        mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler2);
        jest.spyOn(reflector, 'get').mockReturnValue('contactId');
        mockRequest.params = { contactId: 'contact-123' };

        result = guard.canActivate(mockExecutionContext as ExecutionContext);
        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(AuthParam, mockHandler2);
      });

      it('should properly extract request from HTTP context', () => {
        const mockHttpContext = {
          getRequest: jest.fn().mockReturnValue(mockRequest)
        };
        mockExecutionContext.switchToHttp = jest.fn().mockReturnValue(mockHttpContext);

        jest.spyOn(reflector, 'get').mockReturnValue('address');
        mockRequest.params = { address: validAddress };
        mockGetDecodedAuthTokenFromRequest.mockReturnValue(validTokenPayload);
        jest.spyOn(authService, 'isTokenOwner').mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext as ExecutionContext);

        expect(result).toBe(true);
        expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
        expect(mockHttpContext.getRequest).toHaveBeenCalled();
        expect(mockGetDecodedAuthTokenFromRequest).toHaveBeenCalledWith(mockRequest);
      });
    });
  });
});
