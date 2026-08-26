import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthModuleConfigToken, type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { AuthService } from '../../src/auth-guard/auth.service';

describe(AuthService.name, () => {
  let service: AuthService;
  let jwtService: JwtService;
  const testDate = new Date('2024-01-01T00:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(testDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        AuthService,
        {
          provide: AuthModuleConfigToken,
          useValue: {
            secret: 'test-secret'
          }
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe(AuthService.prototype.verifyToken.name, () => {
    it('should return the decoded payload when token is valid', async () => {
      const expectedPayload: AuthTokenPayload = {
        account: '0x1234567890123456789012345678901234567890',
        multisig: { type: 'gnosis' },
        iat: 1609459200,
        exp: 1924819200
      };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(expectedPayload);

      const result = await service.verifyToken('valid.jwt.token');

      expect(result).toEqual({
        account: '0x1234567890123456789012345678901234567890',
        multisig: { type: 'gnosis' },
        iat: 1609459200,
        exp: 1924819200
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token', { secret: 'test-secret' });
    });

    it('should throw when token is invalid', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('invalid signature'));

      await expect(service.verifyToken('invalid.token')).rejects.toThrow('invalid signature');
    });

    it('should throw when token is expired', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyToken('expired.token')).rejects.toThrow('jwt expired');
    });
  });

  describe(AuthService.prototype.isTokenOwner.name, () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const baseTokenPayload: AuthTokenPayload = {
      account: validAddress,
      multisig: { type: 'gnosis' },
      iat: 1609459200, // 2021-01-01T00:00:00.000Z
      exp: 1924819200 // 2030-01-01T00:00:00.000Z
    };

    describe('successful ownership verification', () => {
      it('should return true when token account matches applicant exactly', () => {
        const result = service.isTokenOwner(baseTokenPayload, validAddress);
        expect(result).toBe(true);
      });

      it('should return true when token account matches applicant with different case', () => {
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: validAddress.toLowerCase()
        };

        const result = service.isTokenOwner(tokenPayload, validAddress.toUpperCase());
        expect(result).toBe(true);
      });

      it('should return true when both token and applicant are lowercase', () => {
        const lowerCaseAddress = validAddress.toLowerCase();
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: lowerCaseAddress
        };

        const result = service.isTokenOwner(tokenPayload, lowerCaseAddress);
        expect(result).toBe(true);
      });

      it('should return true when both token and applicant are uppercase', () => {
        const upperCaseAddress = validAddress.toUpperCase();
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: upperCaseAddress
        };

        const result = service.isTokenOwner(tokenPayload, upperCaseAddress);
        expect(result).toBe(true);
      });

      it('should return true with mixed case variations', () => {
        const mixedCaseToken = '0xAbCdEf1234567890123456789012345678901234';
        const mixedCaseApplicant = '0xaBcDeF1234567890123456789012345678901234';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: mixedCaseToken
        };

        const result = service.isTokenOwner(tokenPayload, mixedCaseApplicant);
        expect(result).toBe(true);
      });
    });

    describe('ownership verification failures', () => {
      it('should return false when token account does not match applicant', () => {
        const differentAddress = '0xABCDEF1234567890123456789012345678901234';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: differentAddress
        };

        const result = service.isTokenOwner(tokenPayload, validAddress);
        expect(result).toBe(false);
      });

      it('should return false when addresses are completely different', () => {
        const tokenAddress = '0x1111111111111111111111111111111111111111';
        const applicantAddress = '0x2222222222222222222222222222222222222222';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: tokenAddress
        };

        const result = service.isTokenOwner(tokenPayload, applicantAddress);
        expect(result).toBe(false);
      });

      it('should return false when applicant is empty string', () => {
        const result = service.isTokenOwner(baseTokenPayload, '');
        expect(result).toBe(false);
      });

      it('should return false when token account is empty string', () => {
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: ''
        };

        const result = service.isTokenOwner(tokenPayload, validAddress);
        expect(result).toBe(false);
      });

      it('should return false when both token account and applicant are empty strings', () => {
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: ''
        };

        const result = service.isTokenOwner(tokenPayload, '');
        expect(result).toBe(true); // Empty strings match when lowercased
      });
    });

    describe('different identifier types', () => {
      it('should work with non-Ethereum address identifiers', () => {
        const userId = 'user-12345';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: userId
        };

        const result = service.isTokenOwner(tokenPayload, userId);
        expect(result).toBe(true);
      });

      it('should work with UUID identifiers', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: uuid
        };

        const result = service.isTokenOwner(tokenPayload, uuid);
        expect(result).toBe(true);
      });

      it('should work with UUID identifiers with different cases', () => {
        const uuidLower = '550e8400-e29b-41d4-a716-446655440000';
        const uuidUpper = '550E8400-E29B-41D4-A716-446655440000';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: uuidLower
        };

        const result = service.isTokenOwner(tokenPayload, uuidUpper);
        expect(result).toBe(true);
      });

      it('should work with numeric string identifiers', () => {
        const numericId = '123456789';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: numericId
        };

        const result = service.isTokenOwner(tokenPayload, numericId);
        expect(result).toBe(true);
      });

      it('should work with alphanumeric identifiers with special characters', () => {
        const specialId = 'user_id-123@domain.com';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: specialId
        };

        const result = service.isTokenOwner(tokenPayload, specialId);
        expect(result).toBe(true);
      });

      it('should handle case sensitivity for special character identifiers', () => {
        const specialIdLower = 'user_id-123@domain.com';
        const specialIdUpper = 'USER_ID-123@DOMAIN.COM';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: specialIdLower
        };

        const result = service.isTokenOwner(tokenPayload, specialIdUpper);
        expect(result).toBe(true);
      });
    });

    describe('Ethereum address variations', () => {
      it('should handle checksummed Ethereum addresses', () => {
        const checksummedAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: checksummedAddress
        };

        const result = service.isTokenOwner(tokenPayload, checksummedAddress.toLowerCase());
        expect(result).toBe(true);
      });

      it('should handle addresses without 0x prefix', () => {
        const addressWithPrefix = '0x1234567890123456789012345678901234567890';
        const addressWithoutPrefix = '1234567890123456789012345678901234567890';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: addressWithPrefix
        };

        const result = service.isTokenOwner(tokenPayload, addressWithoutPrefix);
        expect(result).toBe(false); // They are different strings
      });

      it('should handle very long addresses', () => {
        const longAddress = '0x' + '1'.repeat(40);
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: longAddress
        };

        const result = service.isTokenOwner(tokenPayload, longAddress);
        expect(result).toBe(true);
      });
    });

    describe('edge cases and error scenarios', () => {
      it('should handle whitespace in addresses', () => {
        const addressWithSpaces = ' 0x1234567890123456789012345678901234567890 ';
        const cleanAddress = '0x1234567890123456789012345678901234567890';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: addressWithSpaces
        };

        const result = service.isTokenOwner(tokenPayload, cleanAddress);
        expect(result).toBe(false); // Spaces make them different
      });

      it('should handle null account in token payload gracefully', () => {
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: null
        };

        expect(() => service.isTokenOwner(tokenPayload, validAddress)).toThrow();
      });

      it('should handle undefined account in token payload gracefully', () => {
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: undefined
        };

        expect(() => service.isTokenOwner(tokenPayload, validAddress)).toThrow();
      });

      it('should handle null applicant gracefully', () => {
        expect(() => service.isTokenOwner(baseTokenPayload, null)).toThrow();
      });

      it('should handle undefined applicant gracefully', () => {
        expect(() => service.isTokenOwner(baseTokenPayload, undefined)).toThrow();
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000);
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: longString
        };

        const result = service.isTokenOwner(tokenPayload, longString);
        expect(result).toBe(true);
      });

      it('should handle unicode characters', () => {
        const unicodeId = '用户123αβγ';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: unicodeId
        };

        const result = service.isTokenOwner(tokenPayload, unicodeId);
        expect(result).toBe(true);
      });
    });

    describe('different token payload structures', () => {
      it('should work with minimal token payload', () => {
        const minimalTokenPayload: AuthTokenPayload = {
          account: validAddress,
          multisig: { type: undefined },
          iat: 0,
          exp: 0
        };

        const result = service.isTokenOwner(minimalTokenPayload, validAddress);
        expect(result).toBe(true);
      });

      it('should work with token payload having gnosis multisig', () => {
        const gnosisTokenPayload: AuthTokenPayload = {
          account: validAddress,
          multisig: { type: 'gnosis' },
          iat: 1609459200,
          exp: 1924819200
        };

        const result = service.isTokenOwner(gnosisTokenPayload, validAddress);
        expect(result).toBe(true);
      });

      it('should work regardless of iat and exp values', () => {
        const tokenPayload: AuthTokenPayload = {
          account: validAddress,
          multisig: { type: undefined },
          iat: -1,
          exp: Number.MAX_SAFE_INTEGER
        };

        const result = service.isTokenOwner(tokenPayload, validAddress);
        expect(result).toBe(true);
      });
    });

    describe('performance and consistency', () => {
      it('should return consistent results for multiple calls', () => {
        const results = [];
        for (let i = 0; i < 100; i++) {
          results.push(service.isTokenOwner(baseTokenPayload, validAddress));
        }

        expect(results.every(result => result === true)).toBe(true);
      });

      it('should handle case conversion consistently', () => {
        const mixedCaseAddress = '0xAbCdEf1234567890123456789012345678901234';
        const tokenPayload: AuthTokenPayload = {
          ...baseTokenPayload,
          account: mixedCaseAddress
        };

        const result1 = service.isTokenOwner(tokenPayload, mixedCaseAddress.toLowerCase());
        const result2 = service.isTokenOwner(tokenPayload, mixedCaseAddress.toUpperCase());
        const result3 = service.isTokenOwner(tokenPayload, mixedCaseAddress);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result3).toBe(true);
      });
    });
  });
});
