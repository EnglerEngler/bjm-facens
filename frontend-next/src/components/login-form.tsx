"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";
import { pushFlashToast } from "@/lib/flash-toast";
import { useAuth } from "@/providers/auth-provider";
import { LGPD_PATH, roleDefaultPath, roleOnboardingPath } from "@/lib/role-utils";
import type { Patient, User, UserRole } from "@/types/domain";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres."),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
  role: z.enum(["doctor", "patient", "admin", "clinic_admin"]),
  clinicName: z.string().optional(),
  clinicJoinCode: z.string().optional(),
}).superRefine((payload, ctx) => {
  if ((payload.role === "doctor" || payload.role === "patient") && !payload.clinicJoinCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clinicJoinCode"],
      message: "Código da clínica é obrigatório para médico e paciente.",
    });
  }
  if (payload.role === "clinic_admin" && !payload.clinicName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clinicName"],
      message: "Nome da clínica é obrigatório para admin de clínica.",
    });
  }
});

const getReadableErrorMessage = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Array<{ message?: unknown }> | null;
      if (Array.isArray(parsed)) {
        const messages = parsed
          .map((item) => (typeof item?.message === "string" ? item.message : null))
          .filter((message): message is string => Boolean(message));
        if (messages.length > 0) return messages.join(" ");
      }
    } catch {
      // Message is not JSON payload.
    }

    return error.message;
  }

  return "Falha na autenticação.";
};

export function LoginForm() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [clinicName, setClinicName] = useState("");
  const [clinicJoinCode, setClinicJoinCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePostLoginPath = async (user: User) => {
    if (!user.lgpdAccepted) return LGPD_PATH;
    if (!user.onboardingCompleted) return roleOnboardingPath(user.role);
    if (user.role !== "patient") return roleDefaultPath(user.role);
    const profile = await apiRequest<Patient>("/patients/me/profile");
    return profile.onboardingCompleted ? "/patient/dashboard" : "/patient/onboarding";
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      if (mode === "login") {
        const parsed = loginSchema.parse({ email, password });
        const session = await login(parsed.email, parsed.password, rememberMe);
        router.push(await resolvePostLoginPath(session.user));
      } else {
        const parsed = registerSchema.parse({ name, email, password, role, clinicName, clinicJoinCode });
        await register(parsed);
        setMode("login");
        setName("");
        setPassword("");
        setClinicName("");
        setClinicJoinCode("");
        setRememberMe(true);
        pushFlashToast("Conta criada. Faça login para continuar.");
      }
    } catch (err) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card login-form-card">
      <div className="login-form-header">
        <h2>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
        <p>{mode === "login" ? "Acesse sua conta para continuar." : "Preencha os dados para criar sua conta."}</p>
      </div>
      <form onSubmit={submit} noValidate>
        {mode === "register" && (
          <label className="login-field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        <label className="login-field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="login-field">
          <span>Senha</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {mode === "login" && (
          <label className="login-checkbox">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span>Lembrar-me neste dispositivo</span>
          </label>
        )}

        {mode === "register" && (
          <label className="login-field">
            <span>Perfil</span>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="doctor">Médico</option>
              <option value="patient">Paciente</option>
              <option value="clinic_admin">Admin de Clínica</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}

        {mode === "register" && (role === "doctor" || role === "patient") && (
          <label className="login-field">
            <span>Código da Clínica</span>
            <input value={clinicJoinCode} onChange={(e) => setClinicJoinCode(e.target.value)} />
          </label>
        )}

        {mode === "register" && role === "clinic_admin" && (
          <label className="login-field">
            <span>Nome da Clínica</span>
            <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
          </label>
        )}

        <div className="row login-form-actions">
          <button type="submit" disabled={loading} className="login-action-btn login-action-btn-primary">
            {loading ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
          <button
            type="button"
            className="login-action-btn login-action-btn-secondary"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </button>
        </div>

        {error && <p className="error login-form-error">{error}</p>}
      </form>
    </div>
  );
}
