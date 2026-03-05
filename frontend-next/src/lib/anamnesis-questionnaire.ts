export interface AnamnesisQuestion {
  id: string;
  prompt: string;
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
    id: "medical_history",
    title: "Bloco 1: Histórico Médico",
    questions: [
      { id: "chronic_disease", prompt: "Você tem ou já teve alguma doença crônica?" },
      { id: "surgery_history", prompt: "Você já passou por alguma cirurgia?" },
      { id: "known_allergies", prompt: "Você possui alguma alergia?" },
      { id: "covid_infection", prompt: "Você já contraiu COVID-19?" },
      { id: "covid_vaccination", prompt: "Você se vacinou contra COVID-19?" },
      { id: "current_medication_use", prompt: "Você faz uso de algum medicamento atualmente?" },
      { id: "medication_allergy", prompt: "Você tem alergia a algum medicamento?" },
    ],
  },
  {
    id: "lifestyle",
    title: "Bloco 2: Estilo de Vida",
    questions: [
      { id: "smoking", prompt: "Você é fumante?" },
      { id: "smoking_duration", prompt: "Por quanto tempo você fumou? (meses)", conditionalOn: { id: "smoking", match: ["sim"] } },
      { id: "alcohol_consumption", prompt: "Você consome bebida alcoólica?" },
      {
        id: "alcohol_type",
        prompt: "Qual tipo de bebida você consome?",
        conditionalOn: { id: "alcohol_consumption", match: ["sim"] },
      },
      {
        id: "alcohol_frequency",
        prompt: "Com que frequência você consome?",
        conditionalOn: { id: "alcohol_consumption", match: ["sim"] },
      },
      { id: "diet", prompt: "Você segue algum tipo de dieta específica?" },
      { id: "diet_type", prompt: "Qual dieta você segue?", conditionalOn: { id: "diet", match: ["sim"] } },
      { id: "diet_duration", prompt: "Há quanto tempo você segue essa dieta?", conditionalOn: { id: "diet", match: ["sim"] } },
      { id: "meals_per_day", prompt: "Quais refeições você faz ao longo do dia?" },
      { id: "meal_restrictions", prompt: "Em cada refeição do dia, quais alimentos você não costuma consumir?" },
      { id: "food_allergy", prompt: "Você tem alergia a algum alimento?" },
      { id: "liquids_during_meals", prompt: "Você consome líquidos durante as refeições?" },
      { id: "daily_hydration", prompt: "Quais tipos de líquidos você consome ao longo do dia?" },
      { id: "exercise", prompt: "Você pratica exercícios físicos?" },
      { id: "exercise_frequency", prompt: "Quantas vezes por semana você pratica?" },
      { id: "exercise_type", prompt: "Quais exercícios você pratica?" },
      { id: "sun_exposure", prompt: "Você costuma se expor ao sol regularmente?" },
      { id: "sun_exposure_frequency", prompt: "Quantas vezes por semana você toma sol?" },
      { id: "sleep_quality", prompt: "Qual nota você daria para a qualidade do seu sono?" },
      { id: "sleep_hours", prompt: "Quantas horas você dorme por noite?" },
      { id: "sleep_rem", prompt: "Porcentagem de sono REM" },
      { id: "sleep_deep", prompt: "Porcentagem de sono profundo" },
      { id: "relaxation_activity", prompt: "Você pratica alguma atividade para relaxar?" },
      { id: "relaxation_activity_type", prompt: "Quais atividades de relaxamento você pratica?" },
      { id: "daily_routine", prompt: "Como você descreveria seu dia a dia?" },
      { id: "health_objectives", prompt: "Quais seus objetivos na saúde?" },
      { id: "supplements", prompt: "Quais suplementos você consome?" },
    ],
  },
  {
    id: "symptoms",
    title: "Bloco 3: Sintomas",
    questions: [
      { id: "pain_discomfort", prompt: "Você sente algum tipo de dor ou desconforto?" },
      { id: "bowel_regular", prompt: "Seu intestino funciona regularmente todos os dias?" },
      { id: "urination_difficulty", prompt: "Você tem dificuldade para urinar?" },
      { id: "night_urination", prompt: "Você acorda durante a noite para urinar?" },
    ],
  },
  {
    id: "gender",
    title: "Bloco 4: Gênero",
    questions: [
      { id: "biological_sex", prompt: "Qual é o seu sexo biológico? (masculino/feminino)" },
      {
        id: "male_erection_quality",
        prompt: "Você está satisfeito com a qualidade das suas ereções?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_complete_intercourse",
        prompt: "Você consegue completar a relação sexual?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_premature_ejaculation",
        prompt: "Você tem ejaculação precoce?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_spontaneous_erections",
        prompt: "Você tem ereções espontâneas durante a noite?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "male_testicular_trauma",
        prompt: "Você tem histórico de trauma testicular ou genital?",
        conditionalOn: { id: "biological_sex", match: ["masculino"] },
      },
      {
        id: "female_regular_cycle",
        prompt: "Seu ciclo menstrual é regular?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_cycle_short",
        prompt: "Seu ciclo tem duração menor que 24 dias?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_menstrual_symptoms",
        prompt: "Você apresenta sintomas durante a menstruação?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_contraceptive",
        prompt: "Você usa anticoncepcional?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_mammography",
        prompt: "Você já fez mamografia?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_pregnant",
        prompt: "Você está grávida?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_cycle_phase",
        prompt: "Em qual fase do ciclo menstrual você está?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
      },
      {
        id: "female_planning_pregnancy",
        prompt: "Você está planejando engravidar?",
        conditionalOn: { id: "biological_sex", match: ["feminino"] },
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
