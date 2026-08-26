import { toHumanNftfi } from '../src/format';

describe('toHumanNftfi', () => {
  it('trims the trailing .0 on whole-token amounts', () => {
    expect(toHumanNftfi('21328000000000000000000')).toBe('21328');
  });

  it('keeps fractional amounts exact, without rounding', () => {
    expect(toHumanNftfi('730573803116978951809383')).toBe('730573.803116978951809383');
  });

  it('keeps a simple fractional amount as-is', () => {
    expect(toHumanNftfi('200000000000000000')).toBe('0.2');
  });

  it('does not collapse sub-cent dust to zero', () => {
    expect(toHumanNftfi('6474557340648027')).toBe('0.006474557340648027');
  });

  it('renders a zero balance as 0', () => {
    expect(toHumanNftfi('0')).toBe('0');
  });

  it('only trims a whole .0, never a trailing zero inside a fraction', () => {
    expect(toHumanNftfi('198330142000000000000000')).toBe('198330.142');
  });
});
