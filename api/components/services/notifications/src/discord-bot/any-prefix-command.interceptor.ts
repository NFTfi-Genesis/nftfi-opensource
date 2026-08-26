import { PrefixCommandInterceptor } from '@discord-nestjs/common';

export class AnyPrefixCommandInterceptor extends PrefixCommandInterceptor {
  protected getPrefix(_m: string, prefix: string): string {
    return prefix;
  }
}
