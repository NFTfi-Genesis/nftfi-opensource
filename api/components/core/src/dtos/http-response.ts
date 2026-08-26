export enum HttpResponseHeader {
  PaginationPage = 'X-Pagination-Page',
  PaginationLimit = 'X-Pagination-Limit',
  PaginationTotal = 'X-Pagination-Total'
}

export const ApiPaginationHeaders = {
  [HttpResponseHeader.PaginationPage]: { description: 'Current page number', schema: { type: 'number' } },
  [HttpResponseHeader.PaginationLimit]: { description: 'Number of items per page', schema: { type: 'number' } },
  [HttpResponseHeader.PaginationTotal]: { description: 'Total count of items', schema: { type: 'number' } }
};
