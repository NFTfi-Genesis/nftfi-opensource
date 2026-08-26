import * as path from 'path';
import * as fs from 'fs';

export const getBaseDir = (dir?: string): string => {
  const dirpath = dir ?? path.join(process.cwd(), 'tmp');

  if (!fs.existsSync(dirpath)) fs.mkdirSync(dirpath);
  return dirpath;
};
