"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { roleDefaultPath } from "@/lib/role-utils";
import type { UserRole } from "@/types/domain";

const rolePrefix: Record<UserRole, string> = {
  doctor: "/doctor",
  patient: "/patient",
  admin: "/admin",
};

export const useAuthRedirect = () => {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!session && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (!session) return;

    if (pathname === "/login") {
      router.replace(roleDefaultPath(session.user.role));
      return;
    }

    const prefix = rolePrefix[session.user.role];
    if (!pathname.startsWith(prefix)) {
      router.replace("/unauthorized");
    }
  }, [session, loading, pathname, router]);
};
