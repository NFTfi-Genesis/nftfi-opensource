import { validate } from 'class-validator';
import { IsFutureDate } from '../src/decorators/is-future-date.decorator';

describe('IsFutureDate', () => {
  class Future {
    @IsFutureDate()
    when: unknown;

    constructor(when: unknown) {
      this.when = when;
    }
  }

  it('passes when the value is a future Date', async () => {
    const future = new Date(Date.now() + 60_000);
    await expect(validate(new Future(future))).resolves.toEqual([]);
  });

  it('fails with the default message when the value is in the past', async () => {
    const past = new Date(Date.now() - 60_000);
    await expect(validate(new Future(past))).resolves.toEqual([
      {
        children: [],
        constraints: { IsFutureDate: 'when must be a date in the future' },
        property: 'when',
        target: { when: past },
        value: past
      }
    ]);
  });

  it('fails when the value is an invalid Date', async () => {
    const invalid = new Date('not-a-date');
    await expect(validate(new Future(invalid))).resolves.toEqual([
      {
        children: [],
        constraints: { IsFutureDate: 'when must be a date in the future' },
        property: 'when',
        target: { when: invalid },
        value: invalid
      }
    ]);
  });

  it('fails when the value is not a Date', async () => {
    await expect(validate(new Future('2099-01-01'))).resolves.toEqual([
      {
        children: [],
        constraints: { IsFutureDate: 'when must be a date in the future' },
        property: 'when',
        target: { when: '2099-01-01' },
        value: '2099-01-01'
      }
    ]);
  });
});
