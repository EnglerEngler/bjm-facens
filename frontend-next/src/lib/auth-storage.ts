import { COOKIE_ROLE_KEY, COOKIE_TOKEN_KEY } from "@/lib/constants";
import type { AuthSession } from "@/types/domain";

const SESSION_KEY = "bjm_session";

export const readSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const writeSession = (session: AuthSession): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  document.cookie = `${COOKIE_TOKEN_KEY}=${session.token}; path=/; max-age=7200; samesite=lax`;
  document.cookie = `${COOKIE_ROLE_KEY}=${session.user.role}; path=/; max-age=7200; samesite=lax`;
};

export const clearSession = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  document.cookie = `${COOKIE_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${COOKIE_ROLE_KEY}=; path=/; max-age=0; samesite=lax`;
};
