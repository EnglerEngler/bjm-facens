"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { roleDefaultPath, roleOnboardingPath } from "@/lib/role-utils";
import type { Patient, UserRole } from "@/types/domain";

const rolePrefix: Record<UserRole, string> = {
  doctor: "/doctor",
  patient: "/patient",
  admin: "/admin",
  clinic_admin: "/clinic",
};

interface UseAuthRedirectOptions {
  allowIncompleteOnboarding?: boolean;
}

export const useAuthRedirect = (options: UseAuthRedirectOptions = {}) => {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const checkOnboarding = async () => {
      if (!session) return;

      const onboardingPath = roleOnboardingPath(session.user.role);
      const isOnboardingRoute = pathname === onboardingPath;

      if (!session.user.onboardingCompleted && !options.allowIncompleteOnboarding && !isOnboardingRoute) {
        router.replace(onboardingPath);
        return;
      }

      if (session.user.role !== "patient") {
        if (session.user.onboardingCompleted && isOnboardingRoute) {
          router.replace(roleDefaultPath(session.user.role));
        }
        return;
      }

      if (!session.user.onboardingCompleted) return;

      const profile = await apiRequest<Patient>("/patients/me/profile");
      if (cancelled) return;

      if (!profile.onboardingCompleted && !options.allowIncompleteOnboarding && !isOnboardingRoute) {
        router.replace(onboardingPath);
        return;
      }

      if (profile.onboardingCompleted && isOnboardingRoute) {
        router.replace(roleDefaultPath(session.user.role));
      }
    };

    if (!session && pathname !== "/login") {
      router.replace("/login");
      return () => {
        cancelled = true;
      };
    }

    if (!session) {
      return () => {
        cancelled = true;
      };
    }

    if (pathname === "/login") {
      void checkOnboarding().catch(() => {
        if (!cancelled) router.replace(roleOnboardingPath(session.user.role));
      });
      return () => {
        cancelled = true;
      };
    }

    const prefix = rolePrefix[session.user.role];
    if (!pathname.startsWith(prefix)) {
      router.replace("/unauthorized");
      return () => {
        cancelled = true;
      };
    }

    void checkOnboarding().catch(() => {
      if (!cancelled && !options.allowIncompleteOnboarding) {
        router.replace(roleOnboardingPath(session.user.role));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session, loading, pathname, router, options.allowIncompleteOnboarding]);
};
