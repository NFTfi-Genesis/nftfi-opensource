import { Reflector } from '@nestjs/core';

export const AuthParam = Reflector.createDecorator<string>();
