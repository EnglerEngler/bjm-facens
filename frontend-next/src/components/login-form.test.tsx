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
        lgpdAccepted: true,
        lgpdAcceptedAt: "2026-03-12T11:00:00.000Z",
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
    expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
  });

  it("valida email no login", async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), "invalido");
    await userEvent.type(screen.getByLabelText(/senha/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
  });

  it("mantém regra de senha mínima no cadastro", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Maria");
    await userEvent.type(screen.getByLabelText(/^e-mail/i), "maria@teste.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "123");
    await userEvent.selectOptions(screen.getByLabelText(/perfil/i), "clinic_admin");
    await userEvent.type(screen.getByLabelText(/nome da clínica/i), "Clínica Teste");
    await userEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByText(/senha deve ter ao menos 6 caracteres/i)).toBeInTheDocument();
  });
});
