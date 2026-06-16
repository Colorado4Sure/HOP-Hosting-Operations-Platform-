import { apiClient } from "@/lib/api/client";

export interface ProductPricing {
  id: string;
  billingCycle: string;
  currency: string;
  price: number;
  setupFee?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: string;
  groupId?: string;
  status: string;
  createdAt: string;
  pricing?: ProductPricing[];
  group?: ProductGroup | null;
}

export interface ProductGroup {
  id: string;
  name: string;
  headline?: string;
  description?: string;
  isVisible: boolean;
  sortOrder?: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface ListProductsParams {
  page?: number;
  perPage?: number;
  search?: string;
  groupId?: string;
  status?: string;
}

export interface PaginatedProductsMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginatedProducts {
  data: Product[];
  meta: PaginatedProductsMeta;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  type?: string;
  status?: string;
  groupId?: string;
  pricing?: { billingCycle: string; currency: string; price: number; setupFee?: number }[];
}

export const productsApi = {
  listProductGroups(): Promise<ProductGroup[]> {
    return apiClient.get("/products/groups");
  },

  createProductGroup(data: { name: string; headline?: string; description?: string; isVisible?: boolean; sortOrder?: number }): Promise<ProductGroup> {
    return apiClient.post("/products/groups", data);
  },

  updateProductGroup(id: string, data: Partial<ProductGroup>): Promise<ProductGroup> {
    return apiClient.put(`/products/groups/${id}`, data);
  },

  listProducts(params?: ListProductsParams): Promise<PaginatedProducts> {
    return apiClient.get("/products", { params });
  },

  getProduct(id: string): Promise<Product> {
    return apiClient.get(`/products/${id}`);
  },

  createProduct(data: CreateProductPayload): Promise<Product> {
    return apiClient.post("/products", data);
  },

  updateProduct(id: string, data: Partial<CreateProductPayload>): Promise<Product> {
    return apiClient.put(`/products/${id}`, data);
  },

  deleteProduct(id: string): Promise<void> {
    return apiClient.delete(`/products/${id}`);
  },

  addPricing(id: string, data: { billingCycle: string; currency: string; price: number; setupFee?: number }): Promise<ProductPricing> {
    return apiClient.post(`/products/${id}/pricing`, data);
  },

  listAddons(): Promise<Addon[]> {
    return apiClient.get("/products/addons");
  },
};
