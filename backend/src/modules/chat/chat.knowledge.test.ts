import { describe, expect, it } from "vitest";
import {
  classifyKnowledgeByRules,
  fallbackKnowledgeSection,
  renderKnowledgeSection,
  retrieveKnowledge,
} from "./chat.knowledge.js";

const POWER_MODEL = {
  version: "1",
  cpuMaximumWatts: 100,
  memoryWattsPerGb: 0.375,
  diskWattsPerGb: 0.01,
  networkWattsPerGb: 0.02,
};

describe("base de conhecimento do GreenER", () => {
  it.each([
    ["O que é o GreenER?", "project-overview", "PROJECT_INFO"],
    ["Quem fez o GreenER?", "project-team", "PROJECT_INFO"],
    ["Quais são as funcionalidades?", "project-features", "PROJECT_INFO"],
    ["Como funciona o GreenER?", "project-architecture", "PROJECT_INFO"],
    ["Me explica as contas", "methodology-overview", "METHODOLOGY"],
    ["Como a energia é calculada?", "energy-calculation", "METHODOLOGY"],
    ["Como é calculada a energia?", "energy-calculation", "METHODOLOGY"],
    ["Como o CO₂e é calculado?", "emissions-calculation", "METHODOLOGY"],
    ["Como é calculada a emissão?", "emissions-calculation", "METHODOLOGY"],
    [
      "De onde vem a intensidade de carbono?",
      "carbon-intensity",
      "METHODOLOGY",
    ],
    [
      "Quais os coeficientes do modelo de potência?",
      "power-model",
      "METHODOLOGY",
    ],
    [
      "Por que o período está parcial?",
      "assumptions-limitations",
      "METHODOLOGY",
    ],
  ])("recupera a seção correta para %s", (question, id, intent) => {
    const section = retrieveKnowledge(question);

    expect(section?.id).toBe(id);
    expect(section?.intent).toBe(intent);
    expect(section?.reference).not.toBe("");
  });

  it("usa a pergunta anterior como pista em continuações curtas", () => {
    const energy = retrieveKnowledge(
      "E a energia?",
      "Como o CO₂e é calculado?",
    );
    const emissions = retrieveKnowledge(
      "E as emissões?",
      "Como a energia é calculada?",
    );

    expect(energy?.id).toBe("energy-calculation");
    expect(emissions?.id).toBe("emissions-calculation");
  });

  it.each([
    "Qual serviço gasta mais energia?",
    "Qual serviço emitiu mais CO₂?",
    "Qual serviço emitiu mais CO₂e?",
    "Resumo ambiental do período",
    "Como está o serviço Billing API?",
  ])("não captura pergunta de dados: %s", (question) => {
    expect(retrieveKnowledge(question)).toBeNull();
  });

  it("classifica por regras quando há cue forte mesmo com referência a serviço", () => {
    expect(
      classifyKnowledgeByRules(
        "Como a energia do serviço Billing API é calculada?",
        true,
      ),
    ).toBe("METHODOLOGY");
  });

  it("não classifica pergunta de dados como conhecimento", () => {
    expect(
      classifyKnowledgeByRules("Qual serviço gasta mais energia?", true),
    ).toBeNull();
  });

  it("usa visão geral como fallback da intenção", () => {
    expect(fallbackKnowledgeSection("PROJECT_INFO").id).toBe(
      "project-overview",
    );
    expect(fallbackKnowledgeSection("METHODOLOGY").id).toBe(
      "methodology-overview",
    );
  });

  it("substitui os coeficientes reais do modelo no texto", () => {
    const section = fallbackKnowledgeSection("METHODOLOGY");
    const rendered = renderKnowledgeSection(section, POWER_MODEL);

    expect(rendered.summary).not.toContain("{{");
    expect(rendered.content).not.toContain("{{");

    const power = renderKnowledgeSection(
      fallbackKnowledgeSection("METHODOLOGY"),
      POWER_MODEL,
    );
    expect(power.summary).toContain("modelo v1");
  });

  it("injeta os valores atuais do modelo de potência", () => {
    const section = retrieveKnowledge(
      "Quais os coeficientes do modelo de potência?",
    );
    const rendered = renderKnowledgeSection(
      section ?? fallbackKnowledgeSection("METHODOLOGY"),
      POWER_MODEL,
    );

    expect(rendered.summary).toContain("100 W");
    expect(rendered.summary).toContain("0,375 W/GB");
    expect(rendered.summary).toContain("0,01 W/GB");
    expect(rendered.summary).toContain("0,02 W/GB");
  });
});
