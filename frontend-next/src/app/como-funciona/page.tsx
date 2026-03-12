import Link from "next/link";
import Image from "next/image";

export default function ComoFuncionaPage() {
  return (
    <main className="story-main">
      <div className="login-backdrop" aria-hidden="true" />
      <Link href="/login" className="login-corner-link">
        Acessar plataforma
      </Link>
      <section className="story-shell">
        <section className="story-hero-panel">
          <Link href="/login" className="login-brand story-brand" aria-label="BJM">
            <Image src="/logo-bjm.png" alt="BJM" width={1362} height={630} priority className="login-brand-logo" />
          </Link>
          <div className="story-hero-panel-content">
            <div className="story-hero-copy">
              <p className="story-chip">Como funciona o projeto</p>
              <h1>Prescrição médica com análise clínica assistida por IA.</h1>
              <p>
                Nesta plataforma, a prescrição não é avaliada de forma isolada. O sistema analisa o contexto completo
                do paciente antes da conduta ser consolidada.
              </p>
              <p>
                O objetivo é simples: reduzir risco clínico, dar mais previsibilidade para a decisão médica e aumentar
                a segurança do tratamento.
              </p>
            </div>

            <section className="story-panel story-hero-side">
              <h2>O que a IA considera</h2>
              <p>Alergias e intolerâncias registradas no prontuário.</p>
              <p>Comorbidades e histórico clínico relevante.</p>
              <p>Medicamentos em uso e possíveis interações.</p>
              <p>Eventos prévios e padrões de risco já observados.</p>
            </section>
          </div>
        </section>

        <div className="story-panels">
          <section className="story-panel">
            <h2 className="story-section-title">Da prescrição à decisão clínica</h2>
            <div className="story-flow-grid">
              <article className="story-flow-card">
                <p className="story-step">Passo 01</p>
                <h3>Prescrição estruturada</h3>
                <p>
                  O médico registra medicamentos, dose, frequência, via de administração e duração em um fluxo único e
                  organizado.
                </p>
              </article>
              <article className="story-flow-card">
                <p className="story-step">Passo 02</p>
                <h3>Varredura automática do contexto</h3>
                <p>
                  Assim que a prescrição é criada, a IA confronta os dados clínicos do paciente para identificar risco
                  terapêutico antes da decisão final.
                </p>
              </article>
              <article className="story-flow-card">
                <p className="story-step">Passo 03</p>
                <h3>Alertas priorizados por severidade</h3>
                <p>
                  O sistema destaca o que realmente importa no momento da conduta, com foco em contraindicações e
                  interações de maior impacto.
                </p>
              </article>
              <article className="story-flow-card">
                <p className="story-step">Passo 04</p>
                <h3>Decisão médica e rastreabilidade</h3>
                <p>
                  A decisão continua sendo do médico, com justificativas e histórico auditável para continuidade do
                  cuidado e revisão clínica futura.
                </p>
              </article>
            </div>
          </section>

          <section className="story-panel story-actions">
            <h2 className="story-section-title">Resultado para quem cuida e para quem é cuidado</h2>
            <p>
              Para o médico, a plataforma melhora a confiança no momento de prescrever, com suporte objetivo para
              decisões de risco.
            </p>
            <p>
              Para o paciente, aumenta a segurança terapêutica, reduz a chance de condutas incompatíveis com o
              histórico clínico e fortalece a continuidade do cuidado.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
