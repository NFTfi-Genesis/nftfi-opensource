import { isString } from 'lodash';
import { ValueTransformer } from 'typeorm';

export const toLowerCase: ValueTransformer = {
  to: (value: string) => (isString(value) ? value.toLowerCase() : value),
  from: (value: string) => value
};

export const toDate: ValueTransformer = { to: (value: Date) => value, from: (value: string) => new Date(value) };
