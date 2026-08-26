export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type SortParams<TSortField extends string = string, TSortOrder = SortOrder> = {
  sortBy: TSortField
  sortOrder: TSortOrder
}
