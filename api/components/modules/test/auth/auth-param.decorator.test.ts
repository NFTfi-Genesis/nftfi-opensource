import { Reflector } from '@nestjs/core';
import { Controller, Get, Param } from '@nestjs/common';
import { AuthParam } from '@nftfi.api/modules/auth-guard';

describe(AuthParam.name, () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('decorator functionality', () => {
    it('should set metadata correctly when applied to method', () => {
      class TestController {
        @AuthParam('address')
        @Get('/test/:address')
        testMethod(@Param('address') address: string): string {
          return address;
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.testMethod);
      expect(metadata).toBe('address');
    });

    it('should set metadata with different parameter names', () => {
      class TestController {
        @AuthParam('userId')
        @Get('/user/:userId')
        getUserMethod(@Param('userId') userId: string): string {
          return userId;
        }

        @AuthParam('accountId')
        @Get('/account/:accountId')
        getAccountMethod(@Param('accountId') accountId: string): string {
          return accountId;
        }
      }

      const userMetadata = reflector.get(AuthParam, TestController.prototype.getUserMethod);
      const accountMetadata = reflector.get(AuthParam, TestController.prototype.getAccountMethod);

      expect(userMetadata).toBe('userId');
      expect(accountMetadata).toBe('accountId');
    });

    it('should handle empty string parameter', () => {
      class TestController {
        @AuthParam('')
        @Get('/empty')
        emptyParamMethod(): string {
          return 'empty';
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.emptyParamMethod);
      expect(metadata).toBe('');
    });

    it('should return undefined when decorator is not applied', () => {
      class TestController {
        @Get('/no-auth')
        noAuthMethod(): string {
          return 'no auth';
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.noAuthMethod);
      expect(metadata).toBeUndefined();
    });

    it('should work with multiple methods in the same class', () => {
      class TestController {
        @AuthParam('id')
        @Get('/protected/:id')
        protectedMethod(@Param('id') id: string): string {
          return id;
        }

        @Get('/public')
        publicMethod(): string {
          return 'public';
        }

        @AuthParam('address')
        @Get('/account/:address')
        accountMethod(@Param('address') address: string): string {
          return address;
        }
      }

      const protectedMetadata = reflector.get(AuthParam, TestController.prototype.protectedMethod);
      const publicMetadata = reflector.get(AuthParam, TestController.prototype.publicMethod);
      const accountMetadata = reflector.get(AuthParam, TestController.prototype.accountMethod);

      expect(protectedMetadata).toBe('id');
      expect(publicMetadata).toBeUndefined();
      expect(accountMetadata).toBe('address');
    });
  });

  describe('integration with controller methods', () => {
    @Controller('test')
    class TestController {
      @AuthParam('address')
      @Get('/wallet/:address')
      getWallet(@Param('address') address: string): { address: string } {
        return { address };
      }

      @AuthParam('contactId')
      @Get('/contacts/:contactId')
      getContact(@Param('contactId') contactId: string): { contactId: string } {
        return { contactId };
      }

      @Get('/public')
      getPublic(): { message: string } {
        return { message: 'public' };
      }
    }

    it('should correctly identify protected endpoints', () => {
      const walletMetadata = reflector.get(AuthParam, TestController.prototype.getWallet);
      const contactMetadata = reflector.get(AuthParam, TestController.prototype.getContact);
      const publicMetadata = reflector.get(AuthParam, TestController.prototype.getPublic);

      expect(walletMetadata).toBe('address');
      expect(contactMetadata).toBe('contactId');
      expect(publicMetadata).toBeUndefined();
    });

    it('should work with typical Ethereum address parameter', () => {
      class EthereumController {
        @AuthParam('address')
        @Get('/accounts/:address')
        getAccount(@Param('address') address: string): { address: string } {
          return { address };
        }
      }

      const metadata = reflector.get(AuthParam, EthereumController.prototype.getAccount);
      expect(metadata).toBe('address');
    });

    it('should work with UUID parameters', () => {
      class UUIDController {
        @AuthParam('uuid')
        @Get('/resources/:uuid')
        getResource(@Param('uuid') uuid: string): { uuid: string } {
          return { uuid };
        }
      }

      const metadata = reflector.get(AuthParam, UUIDController.prototype.getResource);
      expect(metadata).toBe('uuid');
    });
  });

  describe('decorator inheritance and composition', () => {
    it('should not interfere with other decorators', () => {
      class TestController {
        @AuthParam('id')
        @Get('/test/:id')
        testMethod(@Param('id') id: string): string {
          return id;
        }
      }

      // The AuthParam decorator should not interfere with getting other metadata
      const authMetadata = reflector.get(AuthParam, TestController.prototype.testMethod);
      expect(authMetadata).toBe('id');
    });

    it('should work in inherited classes', () => {
      class BaseController {
        @AuthParam('baseParam')
        @Get('/base/:baseParam')
        baseMethod(@Param('baseParam') param: string): string {
          return param;
        }
      }

      class ExtendedController extends BaseController {
        @AuthParam('extendedParam')
        @Get('/extended/:extendedParam')
        extendedMethod(@Param('extendedParam') param: string): string {
          return param;
        }
      }

      const baseMetadata = reflector.get(AuthParam, BaseController.prototype.baseMethod);
      const extendedMetadata = reflector.get(AuthParam, ExtendedController.prototype.extendedMethod);
      const inheritedMetadata = reflector.get(AuthParam, ExtendedController.prototype.baseMethod);

      expect(baseMetadata).toBe('baseParam');
      expect(extendedMetadata).toBe('extendedParam');
      expect(inheritedMetadata).toBe('baseParam');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in parameter names', () => {
      class TestController {
        @AuthParam('user-id')
        @Get('/user/:user-id')
        getUserWithDash(@Param('user-id') userId: string): string {
          return userId;
        }

        @AuthParam('user_id')
        @Get('/user/:user_id')
        getUserWithUnderscore(@Param('user_id') userId: string): string {
          return userId;
        }
      }

      const dashMetadata = reflector.get(AuthParam, TestController.prototype.getUserWithDash);
      const underscoreMetadata = reflector.get(AuthParam, TestController.prototype.getUserWithUnderscore);

      expect(dashMetadata).toBe('user-id');
      expect(underscoreMetadata).toBe('user_id');
    });

    it('should handle numeric-like parameter names', () => {
      class TestController {
        @AuthParam('123')
        @Get('/numeric/:123')
        getNumericParam(@Param('123') param: string): string {
          return param;
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.getNumericParam);
      expect(metadata).toBe('123');
    });

    it('should handle very long parameter names', () => {
      const longParamName = 'very_long_parameter_name_that_might_be_used_in_some_edge_cases';

      class TestController {
        @AuthParam(longParamName)
        @Get(`/long/:${longParamName}`)
        getLongParam(@Param(longParamName) param: string): string {
          return param;
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.getLongParam);
      expect(metadata).toBe(longParamName);
    });
  });

  describe('type safety', () => {
    it('should accept string parameter correctly', () => {
      // This test mainly ensures TypeScript compilation works correctly
      class TestController {
        @AuthParam('validString')
        @Get('/test/:validString')
        testMethod(@Param('validString') param: string): string {
          return param;
        }
      }

      const metadata = reflector.get(AuthParam, TestController.prototype.testMethod);
      expect(typeof metadata).toBe('string');
      expect(metadata).toBe('validString');
    });
  });
});
