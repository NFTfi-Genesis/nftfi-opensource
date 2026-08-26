import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { Errors } from '@nftfi.api/core/dtos/response-errors.dto';

export interface FlatValidationError {
  /**
   * Object's property path that haven't pass validation.
   */
  path: string;

  /**
   * First constraint that failed validation with error message.
   */
  message: string;
}

export const flattenValidationErrors = (errors: ValidationError[]): FlatValidationError[] => {
  const flatErrors: FlatValidationError[] = [];

  function toFlatArray(error: ValidationError, parentPath: string): void {
    // we format numbers as array indexes for better readability.
    const formattedProperty = Number.isInteger(+error.property)
      ? `[${error.property}]`
      : `${parentPath ? '.' : ''}${error.property}`;

    if (error.constraints) {
      for (const constraint of Object.values(error.constraints)) {
        flatErrors.push({
          path: `${parentPath}${formattedProperty}`,
          message: constraint
        });
      }
    } else if (error.children.length > 0) {
      for (const child of error.children) {
        toFlatArray(child, `${parentPath}${formattedProperty}`);
      }
    }
  }

  for (const error of errors) {
    toFlatArray(error, '');
  }

  return flatErrors;
};

export const httpValidationPipe: ValidationPipe = new ValidationPipe({
  transform: true,
  forbidUnknownValues: true,
  exceptionFactory: (e: ValidationError[]): UnprocessableEntityException => {
    const errors: Errors = flattenValidationErrors(e).reduce(
      (acc, error) => ({
        ...acc,
        [error.path]: [...(acc[error.path] || []), error.message]
      }),
      {}
    );
    return new UnprocessableEntityException({ errors });
  }
});

export const rpcValidationPipe: ValidationPipe = new ValidationPipe({
  transform: true,
  forbidUnknownValues: true,
  exceptionFactory: (e: ValidationError[]): UnprocessableEntityException => {
    const errors: Errors = flattenValidationErrors(e).reduce(
      (acc, error) => ({
        ...acc,
        [error.path]: [...(acc[error.path] || []), error.message]
      }),
      {}
    );
    return new UnprocessableEntityException({ errors });
  }
});
