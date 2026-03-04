import type { AIAssessment } from "@/types/domain";

export function AnamnesisCard({ assessment }: { assessment: AIAssessment }) {
  return (
    <section className="card">
      <h3>Anamnese IA</h3>
      <p>{assessment.outputSummary.summary}</p>
      <h4>Destaques</h4>
      <ul>
        {assessment.outputSummary.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h4>Limitações</h4>
      <ul>
        {assessment.outputSummary.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="muted">
        Prompt: {assessment.promptVersion} | Modelo: {assessment.modelVersion}
      </p>
    </section>
  );
}
