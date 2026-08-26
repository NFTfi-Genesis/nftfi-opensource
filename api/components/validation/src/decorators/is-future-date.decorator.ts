import { Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsFutureDate', async: false })
class IsFutureDateDecorator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return value instanceof Date && !Number.isNaN(value.getTime()) && value.getTime() > Date.now();
  }

  defaultMessage(): string {
    return '$property must be a date in the future';
  }
}

export const IsFutureDate = (): PropertyDecorator => Validate(IsFutureDateDecorator, [], {});
