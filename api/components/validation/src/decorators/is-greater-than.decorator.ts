import { Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { BN } from 'bn.js';

@ValidatorConstraint({ name: 'IsGreaterThan', async: false })
class IsGreaterThanDecorator implements ValidatorConstraintInterface {
  validate(property1: unknown, { object, constraints: [property2] }: ValidationArguments): boolean {
    try {
      const p1 = new BN(property1.toString());
      const p2 = new BN(object[property2].toString());
      return p1.gt(p2);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return '$property must be greater than $constraint1';
  }
}

export const IsGreaterThan = (property: string): PropertyDecorator => Validate(IsGreaterThanDecorator, [property], {});

@ValidatorConstraint({ name: 'IsGreaterOrEqualThan', async: false })
class IsGreaterOrEqualThanDecorator implements ValidatorConstraintInterface {
  validate(property1: unknown, { object, constraints: [property2] }: ValidationArguments): boolean {
    try {
      const p1 = new BN(property1.toString());
      const p2 = new BN(object[property2].toString());
      return p1.gte(p2);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return '$property must be greater or equal than $constraint1';
  }
}

export const IsGreaterOrEqualThan = (property: string): PropertyDecorator =>
  Validate(IsGreaterOrEqualThanDecorator, [property], {});
