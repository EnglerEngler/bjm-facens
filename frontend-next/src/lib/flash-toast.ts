"use client";

const FLASH_TOAST_KEY = "bjm_flash_toast";

export const pushFlashToast = (message: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FLASH_TOAST_KEY, message);
};

export const popFlashToast = () => {
  if (typeof window === "undefined") return null;
  const message = window.sessionStorage.getItem(FLASH_TOAST_KEY);
  if (!message) return null;
  window.sessionStorage.removeItem(FLASH_TOAST_KEY);
  return message;
};
