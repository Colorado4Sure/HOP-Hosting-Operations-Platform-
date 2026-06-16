import { apiClient } from "@/lib/api/client";

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  billingCycle: string;
  groupId?: string;
  status: string;
  createdAt: string;
}

export interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
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

  listProducts(
    params?: ListProductsParams,
  ): Promise<PaginatedProducts> {
    return apiClient.get("/products", { params });
  },

  getProduct(id: string): Promise<Product> {
    return apiClient.get(`/products/${id}`);
  },

  createProduct(data: CreateProductPayload): Promise<Product> {
    return apiClient.post("/products", data);
  },

  updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.patch(`/products/${id}`, data);
  },

  deleteProduct(id: string): Promise<void> {
    return apiClient.delete(`/products/${id}`);
  },

  listAddons(): Promise<Addon[]> {
    return apiClient.get("/products/addons");
  },
};
