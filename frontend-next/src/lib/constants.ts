const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const fallbackApiBaseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3333" : "";

export const API_BASE_URL = configuredApiBaseUrl || fallbackApiBaseUrl;
export const DEFAULT_PATIENT_ID = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_ID ?? "";
