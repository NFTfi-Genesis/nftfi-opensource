export const DEFAULT_RENEGOTIATION_TTL_DAYS = 7;
export const DEFAULT_RENEGOTIATION_MAX_DURATION_SECONDS = 365 * 86400;

export interface RenegotiationV1Config {
  allowedContracts: string[];
  ttlDays: number;
  maxDurationSeconds: number;
}
