import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@hop/shared-types";

export const PERMISSIONS_KEY = "permissions";

/** Marks an endpoint as requiring specific permissions */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
