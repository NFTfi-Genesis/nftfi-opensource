export class OpenSeaNotFoundError extends Error {
  constructor(data: Record<string, unknown> | {}) {
    super(JSON.stringify(data));
  }
}

export class OpenSeaUnknownError extends Error {
  constructor(message: string) {
    super(message);
  }
}
