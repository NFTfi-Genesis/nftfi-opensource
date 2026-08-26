export enum ContentType {
  TEXT = 'text/plain',
  PNG = 'image/png',
  AVIF = 'image/avif',
  JPEG = 'image/jpeg',
  WEBP = 'image/webp',
  SVG = 'image/svg+xml',
  GIF = 'image/gif',
  MP4 = 'video/mp4',
  QUICKTIME = 'video/quicktime'
}

export interface ImageMetadata {
  url: string;
  contentType: ContentType;
}
