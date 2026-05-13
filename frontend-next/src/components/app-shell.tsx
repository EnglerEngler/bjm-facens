"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { popFlashToast } from "@/lib/flash-toast";
import { roleDefaultPath } from "@/lib/role-utils";
import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isOverlayRoute = pathname === "/login" || pathname === "/como-funciona" || pathname === "/lgpd";
  const hideGuestHeaderLoginLink = pathname === "/login" || pathname === "/como-funciona" || pathname === "/lgpd";
  const canAccessDoctorDashboard = session?.user.role === "doctor";
  const canAccessPatientDashboard = session?.user.role === "patient";
  const canAccessAdminArea = session?.user.role === "admin";
  const canAccessClinicAdminArea = session?.user.role === "clinic_admin";
  const canAccessAudit = canAccessAdminArea || canAccessClinicAdminArea;
  const canAccessLogin = !session && !hideGuestHeaderLoginLink;
  const profilePath =
    session?.user.role === "patient"
      ? "/patient/profile"
      : session?.user.role === "doctor"
        ? "/doctor/profile"
        : session?.user.role === "admin"
          ? "/admin/profile"
          : session?.user.role === "clinic_admin"
            ? "/clinic/profile"
            : null;
  const hasMenuEntries =
    canAccessDoctorDashboard || canAccessPatientDashboard || canAccessAdminArea || canAccessClinicAdminArea || canAccessLogin;
  const userName = session?.user.name?.trim() || "";
  const userRoleLabel =
    session?.user.role === "doctor"
      ? "Médico"
      : session?.user.role === "patient"
        ? "Paciente"
        : session?.user.role === "clinic_admin"
          ? "Admin da Clínica"
          : session?.user.role === "admin"
            ? "Administrador"
            : "";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const message = popFlashToast();
    if (!message) return;

    setToastMessage(message);
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const signOut = () => {
    logout();
    setIsMenuOpen(false);
    router.push("/login");
  };

  return (
    <>
      {toastMessage && (
        <div className="app-toast" role="status" aria-live="polite">
          <strong>Salvo</strong>
          <span>{toastMessage}</span>
        </div>
      )}
      {!isOverlayRoute && (
        <header className="card app-header">
          <div className="between" style={{ width: "100%", margin: 0 }}>
            <Link href={session ? roleDefaultPath(session.user.role) : "/login"} aria-label="BJM" className="brand-link">
              <Image src="/logo-bjm.png" alt="BJM" width={1362} height={630} priority className="brand-logo" />
            </Link>
            <div className="header-right">
              {session && (
                <>
                  {profilePath ? (
                    <Link href={profilePath} className="user-chip user-chip-link" aria-label={`Abrir perfil de ${userName}`}>
                      <span className="user-avatar">{userInitials || "U"}</span>
                      <span className="user-info">
                        <strong>{userName}</strong>
                        <small>{userRoleLabel}</small>
                      </span>
                    </Link>
                  ) : (
                    <div className="user-chip" aria-label={`Usuário: ${userName}`}>
                      <span className="user-avatar">{userInitials || "U"}</span>
                      <span className="user-info">
                        <strong>{userName}</strong>
                        <small>{userRoleLabel}</small>
                      </span>
                    </div>
                  )}
                </>
              )}
              {hasMenuEntries && (
                <div className="app-menu" ref={menuRef}>
                  <button
                    type="button"
                    className="menu-trigger"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    aria-label="Abrir menu de navegação"
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                  <nav className={`menu-dropdown${isMenuOpen ? " menu-dropdown-open" : ""}`} aria-label="Menu principal">
                    {canAccessDoctorDashboard && (
                      <Link href="/doctor/dashboard" className="menu-link">
                        Dashboard Médico
                      </Link>
                    )}
                    {canAccessPatientDashboard && (
                      <Link href="/patient/dashboard" className="menu-link">
                        Dashboard Paciente
                      </Link>
                    )}
                    {canAccessPatientDashboard && (
                      <Link href="/patient/anamnesis" className="menu-link">
                        Anamnese
                      </Link>
                    )}
                    {canAccessAdminArea && (
                      <Link href="/admin/dashboard" className="menu-link">
                        Dashboard Admin
                      </Link>
                    )}
                    {canAccessClinicAdminArea && (
                      <Link href="/clinic/dashboard" className="menu-link">
                        Dashboard Clínica
                      </Link>
                    )}
                    {canAccessAudit && (
                      <Link href={canAccessClinicAdminArea ? "/clinic/audit" : "/admin/audit"} className="menu-link">
                        Auditoria
                      </Link>
                    )}
                    {canAccessLogin && (
                      <Link href="/login" className="menu-link">
                        Entrar
                      </Link>
                    )}
                    {session && (
                      <>
                        <div className="menu-divider" />
                        <button type="button" className="menu-link menu-link-danger" onClick={signOut}>
                          Sair
                        </button>
                      </>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      {children}
    </>
  );
}
