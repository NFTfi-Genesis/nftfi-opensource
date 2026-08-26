import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ChatInputCommandInteraction, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { isNil } from 'lodash';

@Injectable()
export class IsAdminUserGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const event: ChatInputCommandInteraction = context.getArgs()[0];

    if (isNil(event.member) || event.member.user.bot) {
      return false;
    }

    if (event.member && !(event.member.permissions as PermissionsBitField).has(PermissionFlagsBits.Administrator)) {
      return false;
    }

    if (event.memberPermissions && !event.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return false;
    }

    return true;
  }
}
