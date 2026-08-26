export class NftPriceFloorNotFoundError extends Error {
  constructor(data: Record<string, unknown> | {}) {
    super(JSON.stringify(data));
  }
}

export class NftPriceFloorUnknownError extends Error {
  constructor(message: string) {
    super(message);
  }
}
