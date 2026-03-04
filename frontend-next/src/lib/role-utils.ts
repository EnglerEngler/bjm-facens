import type { UserRole } from "@/types/domain";

export const roleDefaultPath = (role: UserRole): string => {
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "patient") return "/patient/dashboard";
  if (role === "clinic_admin") return "/clinic/dashboard";
  return "/admin/dashboard";
};
