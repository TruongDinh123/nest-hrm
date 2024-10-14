export interface GetAllUsersParams {
  lastId?: number;
  lastCreatedAt?: Date;
  limit: number;
  offset?: number;
  searchTerm?: string;
  sortOrder?: 'asc' | 'desc';
}
