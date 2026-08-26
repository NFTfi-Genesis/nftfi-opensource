import { SetMetadata } from '@nestjs/common';

export const AUTHGUARD_OPTIONAL_KEY = 'authguard:optional';

export function AuthOptional(): MethodDecorator {
  return SetMetadata(AUTHGUARD_OPTIONAL_KEY, true);
}
