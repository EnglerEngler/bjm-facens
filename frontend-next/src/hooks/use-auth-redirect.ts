"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { roleDefaultPath } from "@/lib/role-utils";
import type { Patient, UserRole } from "@/types/domain";

const rolePrefix: Record<UserRole, string> = {
  doctor: "/doctor",
  patient: "/patient",
  admin: "/admin",
  clinic_admin: "/clinic",
};

interface UseAuthRedirectOptions {
  allowIncompletePatient?: boolean;
}

export const useAuthRedirect = (options: UseAuthRedirectOptions = {}) => {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const checkPatientOnboarding = async () => {
      if (!session || session.user.role !== "patient") return;

      const profile = await apiRequest<Patient>("/patients/me/profile");
      if (cancelled) return;

      const onboardingPath = "/patient/onboarding";
      const isOnboardingRoute = pathname === onboardingPath;

      if (!profile.onboardingCompleted && !options.allowIncompletePatient && !isOnboardingRoute) {
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
      if (session.user.role === "patient") {
        void checkPatientOnboarding().catch(() => {
          if (!cancelled) router.replace("/patient/onboarding");
        });
      } else {
        router.replace(roleDefaultPath(session.user.role));
      }
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

    if (session.user.role === "patient") {
      void checkPatientOnboarding().catch(() => {
        if (!cancelled && !options.allowIncompletePatient) {
          router.replace("/patient/onboarding");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [session, loading, pathname, router, options.allowIncompletePatient]);
};
