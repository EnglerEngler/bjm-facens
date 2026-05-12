import { COOKIE_ROLE_KEY, COOKIE_TOKEN_KEY } from "@/lib/auth-constants";
import type { AuthSession } from "@/types/domain";

const SESSION_KEY = "bjm_session";
const STORAGE_MODE_KEY = "bjm_session_storage_mode";
const SESSION_MODE_PERSISTENT = "persistent";
const SESSION_MODE_TRANSIENT = "transient";

const getActiveStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;

  const mode = window.localStorage.getItem(STORAGE_MODE_KEY);
  if (mode === SESSION_MODE_TRANSIENT) return window.sessionStorage;
  return window.localStorage;
};

export const readSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;

  const storage = getActiveStorage();
  const raw = storage?.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const writeSession = (session: AuthSession): void => {
  if (typeof window === "undefined") return;
  const persistent = session.rememberMe !== false;
  const targetStorage = persistent ? window.localStorage : window.sessionStorage;
  const otherStorage = persistent ? window.sessionStorage : window.localStorage;

  window.localStorage.setItem(STORAGE_MODE_KEY, persistent ? SESSION_MODE_PERSISTENT : SESSION_MODE_TRANSIENT);
  otherStorage.removeItem(SESSION_KEY);
  targetStorage.setItem(SESSION_KEY, JSON.stringify(session));

  const cookieSuffix = persistent ? "; max-age=7200" : "";
  document.cookie = `${COOKIE_TOKEN_KEY}=${session.token}; path=/; samesite=lax${cookieSuffix}`;
  document.cookie = `${COOKIE_ROLE_KEY}=${session.user.role}; path=/; samesite=lax${cookieSuffix}`;
};

export const clearSession = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(STORAGE_MODE_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  document.cookie = `${COOKIE_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${COOKIE_ROLE_KEY}=; path=/; max-age=0; samesite=lax`;
};
