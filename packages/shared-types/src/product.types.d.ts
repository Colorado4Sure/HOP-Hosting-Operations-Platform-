import type { UUID, ISODateString, CurrencyCode } from './common.types';
import type { BillingCycle } from './billing.types';
export type ServiceStatus = 'Active' | 'Pending' | 'Suspended' | 'Terminated' | 'Cancelled' | 'Failed' | 'PendingCancellation';
export interface ProductGroup {
    id: UUID;
    name: string;
    headline?: string;
    description?: string;
    isVisible: boolean;
    sortOrder: number;
    createdAt: ISODateString;
}
export interface ProductPricing {
    id: UUID;
    productId: UUID;
    billingCycle: BillingCycle;
    currency: CurrencyCode;
    price: number;
    setupFee: number;
}
export interface ConfigurableOption {
    id: UUID;
    productId: UUID;
    name: string;
    type: 'Dropdown' | 'Radio' | 'Checkbox' | 'Quantity' | 'Text';
    isRequired: boolean;
    options: ConfigurableOptionValue[];
}
export interface ConfigurableOptionValue {
    id: UUID;
    optionId: UUID;
    name: string;
    priceModifier: number;
    sortOrder: number;
}
export interface Product {
    id: UUID;
    groupId?: UUID;
    group?: ProductGroup;
    name: string;
    description?: string;
    type: 'Shared' | 'Reseller' | 'VPS' | 'Dedicated' | 'Other';
    status: 'Active' | 'Inactive' | 'Hidden';
    moduleType?: string;
    moduleSettings?: Record<string, unknown>;
    pricing: ProductPricing[];
    configurableOptions: ConfigurableOption[];
    stockEnabled: boolean;
    stockLevel?: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface Addon {
    id: UUID;
    name: string;
    description?: string;
    pricing: ProductPricing[];
    isRecurring: boolean;
    createdAt: ISODateString;
}
export interface Service {
    id: UUID;
    clientId: UUID;
    productId: UUID;
    product?: Product;
    status: ServiceStatus;
    billingCycle: BillingCycle;
    currency: CurrencyCode;
    amount: number;
    setupFee: number;
    nextDueDate: ISODateString;
    registrationDate: ISODateString;
    suspendedAt?: ISODateString;
    terminatedAt?: ISODateString;
    cancellationDate?: ISODateString;
    cancellationReason?: string;
    domain?: string;
    username?: string;
    password?: string;
    serverHostname?: string;
    configOptions?: Record<string, unknown>;
    addons?: ServiceAddon[];
    notes?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface ServiceAddon {
    id: UUID;
    serviceId: UUID;
    addonId: UUID;
    addon?: Addon;
    status: ServiceStatus;
    billingCycle: BillingCycle;
    amount: number;
    nextDueDate: ISODateString;
}
//# sourceMappingURL=product.types.d.ts.map