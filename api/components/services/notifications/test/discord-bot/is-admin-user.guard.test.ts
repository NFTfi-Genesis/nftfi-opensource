import { ExecutionContext } from '@nestjs/common';
import { IsAdminUserGuard } from '../../src/discord-bot/guards/is-admin-user.guard';

describe(IsAdminUserGuard.name, () => {
  it('should return false if member is null', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = { getArgs: () => [{ member: null }] } as ExecutionContext;
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should return false if member does not exist on an object', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = { getArgs: () => [{}] } as ExecutionContext;
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should return false if member is bot', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = {
      getArgs: () => [{ member: { user: { bot: true }, permissions: { has: () => false } } }]
    } as ExecutionContext;
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should return false if member does not have admin permissions', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = {
      getArgs: () => [
        {
          member: { user: { bot: false }, permissions: { has: () => false } },
          memberPermissions: { has: () => false }
        }
      ]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should return true if member has admin permissions on member object', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = {
      getArgs: () => [
        {
          member: { user: { bot: false }, permissions: { has: () => true } },
          memberPermissions: { has: () => true }
        }
      ]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should return false if member is not admin and memberPermissions has admin permissions', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = {
      getArgs: () => [
        {
          member: { user: { bot: false }, permissions: { has: () => false } },
          memberPermissions: { has: () => true }
        }
      ]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should return true if member is admin and memberPermissions is missing', async () => {
    const guard = new IsAdminUserGuard();
    const context: ExecutionContext = {
      getArgs: () => [{ member: { user: { bot: false }, permissions: { has: () => true } } }]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
