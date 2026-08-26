import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { IsString, IsNumber } from 'class-validator';
import { flattenValidationErrors, httpValidationPipe, rpcValidationPipe } from '../src/api-validation.pipe';

describe(ValidationPipe.name, () => {
  describe(flattenValidationErrors.name, () => {
    it('flattens validation errors', () => {
      const errors = [
        {
          property: 'name',
          children: [
            {
              property: 'first',
              constraints: {
                isString: 'first must be a string'
              },
              children: []
            },
            {
              property: 'last',
              constraints: {
                isString: 'last must be a string'
              },
              children: []
            }
          ]
        },
        {
          property: 'age',
          constraints: {
            isNumber: 'age must be a number'
          },
          children: []
        }
      ];
      const result = flattenValidationErrors(errors);
      expect(result).toEqual([
        {
          message: 'first must be a string',
          path: 'name.first'
        },
        {
          message: 'last must be a string',
          path: 'name.last'
        },
        {
          message: 'age must be a number',
          path: 'age'
        }
      ]);
    });
  });

  class TestDto {
    @IsString()
    name: string;
    @IsNumber()
    age: number;
  }

  describe('httpValidationPipe', () => {
    it('should return UnprocessableEntityException with errors', () => {
      const promise = httpValidationPipe.transform({}, { metatype: TestDto, type: 'body' });

      expect(promise).rejects.toThrow(
        new UnprocessableEntityException({
          errors: {
            name: ['name must be a string'],
            age: ['age must be a number']
          }
        })
      );
    });
  });

  describe('rpcValidationPipe', () => {
    it('should return UnprocessableEntityException with errors', () => {
      const promise = rpcValidationPipe.transform({}, { metatype: TestDto, type: 'body' });

      expect(promise).rejects.toThrow(
        new UnprocessableEntityException({
          errors: {
            name: ['name must be a string'],
            age: ['age must be a number']
          }
        })
      );
    });
  });
});
