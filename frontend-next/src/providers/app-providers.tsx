"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { AppShell } from "@/components/app-shell";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
