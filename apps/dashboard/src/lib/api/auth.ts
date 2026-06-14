import { apiClient } from "@/lib/api/client";
import type {
  LoginResponse,
  AuthTokens,
  User,
  TwoFactorSetupResponse,
} from "@hop/shared-types";

export const authApi = {
  login(email: string, password: string): Promise<LoginResponse> {
    return apiClient.post("/auth/login", { email, password });
  },

  register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName?: string;
    phone?: string;
  }): Promise<{ message: string }> {
    return apiClient.post("/auth/register", data);
  },

  logout(refreshToken: string): Promise<void> {
    return apiClient.post("/auth/logout", { refreshToken });
  },

  refresh(refreshToken: string): Promise<AuthTokens> {
    return apiClient.post("/auth/refresh", { refreshToken });
  },

  getMe(): Promise<User> {
    return apiClient.get("/auth/me");
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post("/auth/forgot-password", { email });
  },

  resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.post("/auth/reset-password", { token, password });
  },

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return apiClient.patch("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  setup2FA(): Promise<TwoFactorSetupResponse> {
    return apiClient.post("/auth/2fa/setup");
  },

  verify2FA(code: string): Promise<{ message: string }> {
    return apiClient.post("/auth/2fa/verify", { code });
  },
};
