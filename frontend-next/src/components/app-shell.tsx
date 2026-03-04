"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const signOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <header className="card" style={{ marginBottom: 0, borderRadius: 0 }}>
        <div className="between" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <strong>Prescrição Assistida BJM</strong>
          <div className="row">
            {session?.user.role === "doctor" && <Link href="/doctor/dashboard">Dashboard Médico</Link>}
            {session?.user.role === "patient" && <Link href="/patient/dashboard">Dashboard Paciente</Link>}
            {session?.user.role === "admin" && <Link href="/admin/audit">Auditoria</Link>}
            {session && (
              <>
                <span className="muted">{session.user.name}</span>
                <button type="button" onClick={signOut}>
                  Sair
                </button>
              </>
            )}
            {!session && pathname !== "/login" && <Link href="/login">Entrar</Link>}
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
