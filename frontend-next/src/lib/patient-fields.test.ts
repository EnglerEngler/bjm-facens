import { matchesSearch, normalizeSearchText } from "@/lib/patient-fields";

describe("patient-fields", () => {
  it("encontra cpf sem mascara a partir de valor mascarado", () => {
    expect(matchesSearch("12345678900", "Maria Silva", "123.456.789-00")).toBe(true);
  });

  it("encontra cpf mascarado a partir de valor sem mascara", () => {
    expect(matchesSearch("123.456.789-00", "Maria Silva", "12345678900")).toBe(true);
  });

  it("mantem texto comum pesquisavel", () => {
    expect(normalizeSearchText("Dipirona", "Hipertensao")).toContain("dipirona hipertensao");
  });

  it("ignora acentos na busca textual", () => {
    expect(matchesSearch("hipertensão", "hipertensao")).toBe(true);
  });
});
