import _, { Dictionary, isString } from 'lodash';
import { TransformFnParams } from 'class-transformer';
import { utils as ethers } from 'ethers';

export const toChecksummedAddress = ({ value }: TransformFnParams): string => {
  try {
    return ethers.getAddress(value);
  } catch {
    return value;
  }
};

export const toArrayOfChecksummedAddresses = ({ value }: TransformFnParams): string[] => {
  try {
    return value.map(ethers.getAddress);
  } catch {
    return value;
  }
};

export const toArrayOfLowercasedAddresses = ({ value }: TransformFnParams): string[] => {
  try {
    if (typeof value === 'string') {
      if (value === '') return [];
      return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => v.toLowerCase());
    }

    if (Array.isArray(value)) {
      return value.map(v => (typeof v === 'string' ? v.toLowerCase() : v));
    }

    return value;
  } catch {
    return value;
  }
};

export const toLowerCase = ({ value }: TransformFnParams): string => {
  try {
    return value.toLowerCase();
  } catch {
    return value;
  }
};

export const toNumber = ({ value }: TransformFnParams): number => {
  try {
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : value;
  } catch {
    return value;
  }
};

export const toBoolean = ({ value }: TransformFnParams): boolean => {
  if (isString(value)) {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return value;
};

export const toArrayOfStrings = ({ value }: TransformFnParams): string[] => {
  if (typeof value === 'string') {
    return value.split(',');
  }

  return value;
};

export const toArrayOfNumbers = ({ value }: TransformFnParams): number[] => {
  if (typeof value === 'string') {
    if (value === '') {
      return [];
    }

    return value.split(',').map(Number);
  }

  return value;
};

export const toObjectWithoutUndefinedValues = <T = object>(obj: T): T => {
  return _.transform(
    obj as Dictionary<T>,
    (result, value, key) => {
      if (!_.isUndefined(value)) {
        if (_.isObject(value) && !_.isDate(value)) {
          result[key] = toObjectWithoutUndefinedValues(value); // Recursively apply to nested objects
        } else {
          result[key] = value; // Directly assign non-object values
        }
      }
    },
    _.isArray(obj) ? [] : {}
  ) as T;
};
