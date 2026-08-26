import { FormatEnum } from 'sharp';
import { ContentType } from './metadata.types';

export const ContentTypeToExtension = new Map<ContentType, keyof FormatEnum>([
  [ContentType.PNG, 'png'],
  [ContentType.JPEG, 'jpeg'],
  [ContentType.AVIF, 'avif'],
  [ContentType.WEBP, 'webp'],
  [ContentType.SVG, 'jpeg'],
  [ContentType.GIF, 'gif'],
  [ContentType.MP4, 'gif'],
  [ContentType.QUICKTIME, 'gif']
]);

export const ContentShorthandType = new Map<string, ContentType>([
  ['png', ContentType.PNG],
  ['jpeg', ContentType.JPEG],
  ['jpg', ContentType.JPEG],
  ['gif', ContentType.GIF],
  ['webp', ContentType.WEBP]
]);

export const BROWSERISH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  Accept: 'image/*,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive'
};
