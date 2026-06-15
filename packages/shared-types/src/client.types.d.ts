import type { UUID, ISODateString, CountryCode, CurrencyCode } from './common.types';
export type ClientStatus = 'Active' | 'Inactive' | 'Suspended' | 'Closed';
export interface ClientAddress {
    id: UUID;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: CountryCode;
    isPrimary: boolean;
}
export interface ClientContact {
    id: UUID;
    clientId: UUID;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    permissions: string[];
}
export interface ClientNote {
    id: UUID;
    clientId: UUID;
    authorId: UUID;
    authorName: string;
    content: string;
    isSticky: boolean;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface ClientGroup {
    id: UUID;
    name: string;
    description?: string;
    color?: string;
    discountPercent: number;
}
export interface Client {
    id: UUID;
    userId: UUID;
    firstName: string;
    lastName: string;
    companyName?: string;
    email: string;
    phone?: string;
    status: ClientStatus;
    currencyCode: CurrencyCode;
    language: string;
    group?: ClientGroup;
    addresses: ClientAddress[];
    contacts: ClientContact[];
    creditBalance: number;
    taxId?: string;
    taxExempt: boolean;
    notes?: ClientNote[];
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface ClientActivity {
    id: UUID;
    clientId: UUID;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
}
//# sourceMappingURL=client.types.d.ts.map