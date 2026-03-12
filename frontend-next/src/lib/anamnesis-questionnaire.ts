export interface AnamnesisQuestion {
  id: string;
  prompt: string;
  inputType?: "text" | "textarea";
  readOnly?: boolean;
  conditionalOn?: {
    id: string;
    match: string[];
  };
}

export interface AnamnesisBlock {
  id: string;
  title: string;
  questions: AnamnesisQuestion[];
}

export const anamnesisBlocks: AnamnesisBlock[] = [
  {
    id: "symptoms",
    title: "Sintomas",
    questions: [
      { id: "main_complaint", prompt: "Qual é a sua queixa principal?" },
      { id: "symptoms_started_at", prompt: "Quando isso começou?" },
      { id: "symptoms_progression", prompt: "Como os sintomas evoluíram desde o início?" },
    ],
  },
  {
    id: "medical_history",
    title: "Histórico médico",
    questions: [
      { id: "diagnosed_conditions", prompt: "Você tem alguma doença ou condição de saúde já diagnosticada?" },
      { id: "current_medications", prompt: "Você usa algum medicamento atualmente?" },
      { id: "surgeries_or_hospitalizations", prompt: "Já fez alguma cirurgia ou já ficou internado?" },
      { id: "family_history", prompt: "Existe histórico de doenças importantes na sua família?" },
    ],
  },
  {
    id: "lifestyle",
    title: "Estilo de vida",
    questions: [
      { id: "smoking", prompt: "Você fuma?", inputType: "text" },
      { id: "alcohol_consumption", prompt: "Você consome bebida alcoólica?", inputType: "text" },
      { id: "physical_activity", prompt: "Você pratica atividade física?" },
      { id: "sleep_quality", prompt: "Como está seu sono?" },
      { id: "diet_quality", prompt: "Como está sua alimentação?" },
    ],
  },
  {
    id: "body_measurements",
    title: "Medidas corporais",
    questions: [
      { id: "height", prompt: "Qual é a sua altura?", inputType: "text" },
      { id: "weight", prompt: "Qual é o seu peso atual?", inputType: "text" },
      { id: "body_mass_index", prompt: "IMC calculado automaticamente", inputType: "text", readOnly: true },
    ],
  },
  {
    id: "allergies",
    title: "Alergias",
    questions: [
      { id: "has_allergies", prompt: "Você tem alguma alergia?" },
      {
        id: "allergy_details",
        prompt: "Se sim, qual alergia e qual reação ela causa?",
        conditionalOn: { id: "has_allergies", match: ["sim"] },
      },
    ],
  },
  {
    id: "female_specific",
    title: "Perguntas específicas",
    questions: [
      {
        id: "female_pregnancy_possibility",
        prompt: "Você está grávida ou existe possibilidade de gestação?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_menstruation_regular",
        prompt: "Sua menstruação está regular?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_last_menstruation",
        prompt: "Qual foi a data da sua última menstruação?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_menopause",
        prompt: "Você está na menopausa?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_gynecological_symptoms",
        prompt: "Tem algum sintoma ginecológico relevante?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "male_urination_difficulty",
        prompt: "Você tem dificuldade para urinar?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_weak_urine_stream",
        prompt: "Percebe jato urinário fraco?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_night_urination",
        prompt: "Acorda à noite para urinar com frequência?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_urological_symptoms",
        prompt: "Tem algum desconforto urológico relevante?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
    ],
  },
];

const normalize = (value: string | undefined) => (value ?? "").trim().toLowerCase();

export const shouldDisplayQuestion = (question: AnamnesisQuestion, answers: Record<string, string>) => {
  if (!question.conditionalOn) return true;
  const source = normalize(answers[question.conditionalOn.id]);
  return question.conditionalOn.match.some((text) => source.includes(text));
};
