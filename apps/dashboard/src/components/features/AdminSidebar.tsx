"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Package,
  Server,
  Globe,
  MessageSquare,
  BarChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Required permission string. 'admin-only' means SuperAdmin/Admin/Staff only. */
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users, permission: "clients:read" },
  { label: "Billing", href: "/billing/invoices", icon: Receipt, permission: "invoices:read" },
  { label: "Products", href: "/products", icon: Package, permission: "products:read" },
  { label: "Services", href: "/services", icon: Server, permission: "servers:read" },
  { label: "Domains", href: "/domains", icon: Globe, permission: "domains:read" },
  { label: "Support", href: "/support", icon: MessageSquare, permission: "support:read" },
  { label: "Reports", href: "/reports", icon: BarChart, permission: "reports:read" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "admin-only" },
];

const ADMIN_ROLES = new Set(["SuperAdmin", "Admin"]);

function hasAccess(
  permission: string | undefined,
  role: string,
  customPermissions: string[],
): boolean {
  if (!permission) return true; // Dashboard always visible
  if (ADMIN_ROLES.has(role)) return true; // Admins see everything
  if (permission === "admin-only") return false;
  // Staff / Reseller: check custom permissions
  return customPermissions.includes(permission);
}

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const role = user?.role ?? "";
  const customPermissions: string[] = (user as any)?.customPermissions ?? [];

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasAccess(item.permission, role, customPermissions),
  );

  return (
    <aside className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
          H
        </div>
        <span className="font-bold text-lg">HOP Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        HOP &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
