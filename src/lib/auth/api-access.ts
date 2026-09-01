import "server-only";

import { getAccessContext } from "./access";
import { hasPermission, type Permission } from "@/lib/permissions/contracts";

export async function hasApiPermission(permission: Permission) {
  try {
    return hasPermission(await getAccessContext(), permission);
  } catch {
    return false;
  }
}
