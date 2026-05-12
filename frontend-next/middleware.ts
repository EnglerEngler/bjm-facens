import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_ROLE_KEY, COOKIE_TOKEN_KEY } from "@/lib/auth-constants";

const publicRoutes = ["/login", "/como-funciona", "/unauthorized"];

const hasRoleAccess = (pathname: string, role: string) => {
  if (pathname.startsWith("/doctor")) return role === "doctor";
  if (pathname.startsWith("/patient")) return role === "patient";
  if (pathname.startsWith("/admin")) return role === "admin";
  if (pathname.startsWith("/clinic")) return role === "clinic_admin";
  return true;
};

const roleHome = (role: string) => {
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "patient") return "/patient/dashboard";
  if (role === "clinic_admin") return "/clinic/dashboard";
  return "/admin/dashboard";
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_TOKEN_KEY)?.value;
  const role = request.cookies.get(COOKIE_ROLE_KEY)?.value;

  if (!token && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && pathname === "/login" && role) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (token && role && !hasRoleAccess(pathname, role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
