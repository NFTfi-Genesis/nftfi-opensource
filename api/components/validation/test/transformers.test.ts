import { TransformFnParams } from 'class-transformer';
import * as transforms from '../src/transformers';

describe('transforms', () => {
  describe('toArrayOfStrings', () => {
    it('should return array of strings', () => {
      expect(transforms.toArrayOfStrings({ value: 'a,b,c' } as TransformFnParams)).toEqual(['a', 'b', 'c']);
    });

    it('should return array of strings for single value', () => {
      expect(transforms.toArrayOfStrings({ value: 'a' } as TransformFnParams)).toEqual(['a']);
    });

    it('should return value as is if not string is given', () => {
      expect(transforms.toArrayOfStrings({ value: 1 } as TransformFnParams)).toEqual(1);
    });
  });

  describe('toArrayOfLowercasedAddresses', () => {
    it('should return array of lowercase addresses', () => {
      expect(transforms.toArrayOfLowercasedAddresses({ value: '0x123,0x456,0x789' } as TransformFnParams)).toEqual([
        '0x123',
        '0x456',
        '0x789'
      ]);
    });

    it('should return array of lowercase addresses for single value', () => {
      expect(transforms.toArrayOfLowercasedAddresses({ value: '0x123' } as TransformFnParams)).toEqual(['0x123']);
    });

    it('should return value as is if not string is given', () => {
      expect(transforms.toArrayOfLowercasedAddresses({ value: 1 } as TransformFnParams)).toEqual(1);
    });

    it('should return empty array if empty string is given', () => {
      expect(transforms.toArrayOfLowercasedAddresses({ value: '' } as TransformFnParams)).toEqual([]);
    });

    it('should lowercase only string values when array is given', () => {
      expect(transforms.toArrayOfLowercasedAddresses({ value: ['0xABC', 1, '0xDEF'] } as TransformFnParams)).toEqual([
        '0xabc',
        1,
        '0xdef'
      ]);
    });

    it('should return original array when map throws', () => {
      const value: unknown[] & { map: () => never } = [] as unknown[] & { map: () => never };
      value.map = (): never => {
        throw new Error('map failed');
      };

      expect(transforms.toArrayOfLowercasedAddresses({ value } as TransformFnParams)).toBe(value);
    });
  });

  describe('toNumber', () => {
    it('should return number is numeric string is given', () => {
      expect(transforms.toNumber({ value: '123' } as TransformFnParams)).toEqual(123);
    });

    it('should return value as is if number is given', () => {
      expect(transforms.toNumber({ value: 1 } as TransformFnParams)).toEqual(1);
    });

    it('should return original value if invalid numeric value is given', () => {
      expect(transforms.toNumber({ value: 'invalid' } as TransformFnParams)).toEqual('invalid');
    });

    it('should return original value when parseFloat throws', () => {
      const value = {
        toString: (): never => {
          throw new Error('toString failed');
        }
      };

      expect(transforms.toNumber({ value } as TransformFnParams)).toBe(value);
    });
  });

  describe('toArrayOfNumbers', () => {
    it('should return array of numbers', () => {
      expect(transforms.toArrayOfNumbers({ value: '1,2,3' } as TransformFnParams)).toEqual([1, 2, 3]);
    });

    it('should return array of numbers for single value', () => {
      expect(transforms.toArrayOfNumbers({ value: '1' } as TransformFnParams)).toEqual([1]);
    });

    it('should return value as is if not string is given', () => {
      expect(transforms.toArrayOfNumbers({ value: 1 } as TransformFnParams)).toEqual(1);
    });

    it('should return empty array if empty string is given', () => {
      expect(transforms.toArrayOfNumbers({ value: '' } as TransformFnParams)).toEqual([]);
    });
  });

  describe('toObjectWithoutUndefinedValues', () => {
    it('should return object without undefined values', () => {
      expect(transforms.toObjectWithoutUndefinedValues({ a: undefined, b: 1 })).toEqual({ b: 1 });
    });

    it('should return object without undefined values for nested objects', () => {
      expect(transforms.toObjectWithoutUndefinedValues({ a: { b: undefined, c: 1 } })).toEqual({ a: { c: 1 } });
    });
  });
});
