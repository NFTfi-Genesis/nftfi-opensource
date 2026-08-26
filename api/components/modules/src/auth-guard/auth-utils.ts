import * as express from 'express';
import { type AuthTokenPayload } from './auth.types';

export const getAuthTokenFromRequest = (request: express.Request): string => {
  const header = request.get('X-Forwarded-Authorization') || request.get('Authorization');
  const [type, token] = header?.split(' ') ?? [];
  return type === 'Bearer' ? token : '';
};

export const getDecodedAuthTokenFromRequest = (request: express.Request): AuthTokenPayload | null => {
  const token = getAuthTokenFromRequest(request);
  if (token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  }

  return null;
};
