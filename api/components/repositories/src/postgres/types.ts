export interface FindSortOptions<T> {
  by: keyof T;
  direction: 'ASC' | 'DESC';
}

export interface PaginationOptions {
  skip: number;
  limit: number;
}

export type FindOptions<K> = PaginationOptions & {
  sort?: FindSortOptions<K>;
};
