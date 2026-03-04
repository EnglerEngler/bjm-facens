"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { roleDefaultPath } from "@/lib/role-utils";
import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/login";

  const signOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <header className={`card app-header${isLoginRoute ? " app-header-login" : ""}`}>
        <div className="between" style={{ width: "100%", margin: 0 }}>
          <Link href={session ? roleDefaultPath(session.user.role) : "/login"} aria-label="BJM" className="brand-link">
            <Image src="/logo-bjm.png" alt="BJM" width={1362} height={630} priority className="brand-logo" />
          </Link>
          <div className="row">
            {session?.user.role === "doctor" && <Link href="/doctor/dashboard">Dashboard Médico</Link>}
            {session?.user.role === "patient" && <Link href="/patient/dashboard">Dashboard Paciente</Link>}
            {session?.user.role === "admin" && <Link href="/admin/audit">Auditoria</Link>}
            {session && (
              <>
                <span className="muted" aria-label="Usuário logado">
                  {session.user.name}
                </span>
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
