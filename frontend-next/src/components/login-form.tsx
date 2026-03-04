"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";
import { roleDefaultPath } from "@/lib/role-utils";
import type { UserRole } from "@/types/domain";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres."),
  role: z.enum(["doctor", "patient", "admin"]),
});

export function LoginForm() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("doctor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      if (mode === "login") {
        const parsed = loginSchema.parse({ email, password });
        const session = await login(parsed.email, parsed.password);
        router.push(roleDefaultPath(session.user.role));
      } else {
        const parsed = registerSchema.parse({ name, email, password, role });
        await register(parsed);
        const session = await login(parsed.email, parsed.password);
        router.push(roleDefaultPath(session.user.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card login-form-card">
      <h2>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        <label>
          E-mail
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {mode === "register" && (
          <label>
            Perfil
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="doctor">Médico</option>
              <option value="patient">Paciente</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>
            {loading ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
