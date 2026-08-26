export const MAX_DATA_URL_CHARS = 10 * 1024 * 1024; // 10MB of characters (rough cap, pre-decode)
export const MAX_DATA_URL_DECODED_BYTES = 5 * 1024 * 1024; // 5MiB decoded payload cap
export const DEFAULT_MEDIA_MAX_BYTES = 25 * 1024 * 1024; // 25 MiB cap for HTTP image downloads

export interface MediaDimensions {
  maxWidth: number;
  maxHeight: number;
}
