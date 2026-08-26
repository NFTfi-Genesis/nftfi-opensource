import { Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsWeiString', async: false })
class IsWeiStringDecorator implements ValidatorConstraintInterface {
  validate(text: string): boolean {
    const isString = typeof text === 'string';
    const isWeiGreaterThanZero = /^(0|[1-9]\d*)$/.test(String(text));

    return isString && isWeiGreaterThanZero;
  }

  defaultMessage(): string {
    return '$property be positive base units string (eg. `1000000000000000000` wei)';
  }
}

export const IsWeiString = (): PropertyDecorator => Validate(IsWeiStringDecorator);
