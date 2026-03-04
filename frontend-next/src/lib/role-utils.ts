import type { UserRole } from "@/types/domain";

export const roleDefaultPath = (role: UserRole): string => {
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "patient") return "/patient/dashboard";
  return "/admin/audit";
};
