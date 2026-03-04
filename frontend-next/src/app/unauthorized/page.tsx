export const dynamic = "force-dynamic";

export default function UnauthorizedPage() {
  return (
    <main>
      <section className="card">
        <h1>Acesso não autorizado</h1>
        <p>Seu perfil não possui acesso a esta rota.</p>
      </section>
    </main>
  );
}
