export class AlchemyNotFoundError extends Error {
  constructor(data: Record<string, unknown> | {}) {
    super(JSON.stringify(data));
  }
}

export class AlchemyUnknownError extends Error {
  constructor(message: string) {
    super(message);
  }
}
