import { validate } from 'class-validator';
import { IsGreaterOrEqualThan, IsGreaterThan } from '../src/decorators/is-greater-than.decorator';

describe(IsGreaterThan.name, () => {
  it('returns error if property is not satisfying the constraint', async () => {
    class Test {
      @IsGreaterThan('b')
      a = 1;
      b = 2;
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsGreaterThan: 'a must be greater than b' },
        property: 'a',
        target: { a: 1, b: 2 },
        value: 1
      }
    ]);
  });

  it('returns error if property is not a number', async () => {
    class Test {
      @IsGreaterThan('b')
      a = 'aaaaa';
      b = 'bbbbb';
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsGreaterThan: 'a must be greater than b' },
        property: 'a',
        target: {
          a: 'aaaaa',
          b: 'bbbbb'
        },
        value: 'aaaaa'
      }
    ]);
  });

  it('returns no error if property is satisfying the constraint', async () => {
    class Test {
      @IsGreaterThan('b')
      a = 3;
      b = 2;
    }

    await expect(validate(new Test())).resolves.toEqual([]);
  });
});

describe(IsGreaterOrEqualThan.name, () => {
  it('returns error if property is not satisfying the constraint', async () => {
    class Test {
      @IsGreaterOrEqualThan('b')
      a = 1;
      b = 2;
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsGreaterOrEqualThan: 'a must be greater or equal than b' },
        property: 'a',
        target: { a: 1, b: 2 },
        value: 1
      }
    ]);
  });

  it('returns error if property is not a number', async () => {
    class Test {
      @IsGreaterOrEqualThan('b')
      a = 'aaaaa';
      b = 'bbbbb';
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsGreaterOrEqualThan: 'a must be greater or equal than b' },
        property: 'a',
        target: {
          a: 'aaaaa',
          b: 'bbbbb'
        },
        value: 'aaaaa'
      }
    ]);
  });

  it('returns no error if property is satisfying the constraint', async () => {
    class Test {
      @IsGreaterOrEqualThan('b')
      a = 2;
      b = 2;
    }

    await expect(validate(new Test())).resolves.toEqual([]);
  });
});
