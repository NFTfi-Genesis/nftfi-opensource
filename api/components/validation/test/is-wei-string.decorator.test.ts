import { validate } from 'class-validator';
import { IsWeiString } from '../src/decorators/is-wei-string.decorator';

describe(IsWeiString.name, () => {
  it('returns error if property is not a string', async () => {
    class Test {
      @IsWeiString()
      a = 1;
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsWeiString: 'a be positive base units string (eg. `1000000000000000000` wei)' },
        property: 'a',
        target: { a: 1 },
        value: 1
      }
    ]);
  });

  it('returns error if property is not a positive base units string', async () => {
    class Test {
      @IsWeiString()
      a = '-1';
    }

    await expect(validate(new Test())).resolves.toEqual([
      {
        children: [],
        constraints: { IsWeiString: 'a be positive base units string (eg. `1000000000000000000` wei)' },
        property: 'a',
        target: { a: '-1' },
        value: '-1'
      }
    ]);
  });

  it('returns no error if property is a positive base units string', async () => {
    class Test {
      @IsWeiString()
      a = '1000000000000000000';
    }

    await expect(validate(new Test())).resolves.toEqual([]);
  });
});
