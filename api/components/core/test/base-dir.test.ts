import * as path from 'path';
import * as fs from 'fs';
import { getBaseDir } from '../src/utils/base-dir';

jest.mock('fs');

describe('baseDir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
  });
  it('returns the base dir', () => {
    const dir = getBaseDir();
    expect(dir).toEqual(path.join(process.cwd(), 'tmp'));
  });

  it('returns the base dir with a custom dir', () => {
    const dir = getBaseDir('/tmp');
    expect(dir).toEqual('/tmp');
  });

  it('creates the base dir if it does not exist', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const fnMkdir = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);

    const dir = getBaseDir('/tmp/test');

    expect(dir).toEqual('/tmp/test');
    expect(fnMkdir).toHaveBeenCalledTimes(1);
  });
});
