import { getNumEnv } from '../src/utils/env-vars';

describe(getNumEnv.name, () => {
  it('should return the default value if the env var is not set', () => {
    expect(getNumEnv('TEST', 1)).toBe(1);
  });

  it('should return the env var value if it is set', () => {
    process.env.TEST = '2';
    expect(getNumEnv('TEST', 1)).toBe(2);
  });
});
