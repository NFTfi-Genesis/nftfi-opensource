import { CACHE_KEY_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { first } from 'lodash';
import { serializeContext } from '../utils/cache-key-serialize';

@Injectable()
export class RpcCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string {
    if (context.getType() !== 'rpc') {
      return null;
    }

    const classPrefix = this.reflector.get<string>(CACHE_KEY_METADATA, context.getClass()) ?? '';

    const metadata = this.reflector.get<string>(PATTERN_METADATA, context.getHandler());
    if (!metadata) {
      return null;
    }

    const metadataKey = first(metadata);
    if (!metadataKey) {
      return null;
    }

    const rootKey = `${classPrefix}:rpc:${metadataKey}`;

    const [rpcContext] = context.getArgs();
    if (!rpcContext) {
      return rootKey;
    }

    const serializedContext = serializeContext(rpcContext);
    const key = serializedContext ? `${rootKey}:${serializedContext}` : rootKey;

    return key;
  }
}
