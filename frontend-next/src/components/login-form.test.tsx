import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/login-form";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue({
      user: {
        id: "user_1",
        name: "Doctor QA",
        email: "doctor@bjm.local",
        role: "doctor",
        onboardingCompleted: true,
        onboardingCompletedAt: "2026-03-12T12:00:00.000Z",
        createdAt: "2026-03-12T12:00:00.000Z",
      },
    }),
    register: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe("LoginForm", () => {
  it("mostra mensagens legíveis ao enviar vazio", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/senha deve ter ao menos 6 caracteres/i)).toBeInTheDocument();
  });

  it("valida email no login", async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), "invalido");
    await userEvent.type(screen.getByLabelText(/senha/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
  });
});
