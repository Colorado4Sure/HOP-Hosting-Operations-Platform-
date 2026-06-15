/** RFC 4122 UUID string */
export type UUID = string;
/** ISO 8601 date-time string */
export type ISODateString = string;
/** ISO 3166-1 alpha-2 country code */
export type CountryCode = string;
/** ISO 4217 currency code */
export type CurrencyCode = string;
/** Pagination metadata returned from list endpoints */
export interface PaginationMeta {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}
/** Generic paginated response envelope */
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}
/** Standard API error shape */
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
    timestamp: ISODateString;
    path: string;
    requestId?: string;
}
/** Standard API success envelope */
export interface ApiResponse<T = unknown> {
    success: true;
    data: T;
    requestId?: string;
}
/** Sort direction */
export type SortOrder = 'asc' | 'desc';
/** Common list query params */
export interface ListQueryParams {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
    search?: string;
}
/** Money amount with currency */
export interface MoneyAmount {
    amount: number;
    currency: CurrencyCode;
}
//# sourceMappingURL=common.types.d.ts.map