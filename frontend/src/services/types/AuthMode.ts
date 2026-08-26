export enum AuthMode {
  // Authentication will be used. If failed to refresh jwt token, request will stop.
  Required = 'required',
  // Authentication will be used. If failed to refresh jwt token, request will proceed.
  Optional = 'optional',
  // Authentication is not used.
  None = 'none',
}
