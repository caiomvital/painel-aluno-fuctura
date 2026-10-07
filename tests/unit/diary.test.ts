import { describe, expect, test } from "bun:test";
import { assertTestDatabase } from "../helpers/database";
import {
  parseTopicsList,
  parseMaterialsList,
  extractPlannedTopics,
  extractTaughtTopics,
} from "../../lib/academic-service";

describe("proteção do banco de testes", () => {
  test("aceita PostgreSQL local com nome de testes", () => {
    expect(
      assertTestDatabase("postgresql://tester@127.0.0.1:5432/fuctura_test"),
    ).toContain("fuctura_test");
  });
  test.each([
    undefined,
    "invalid",
    "postgresql://user:secret@db.example.com/fuctura_test",
    "postgresql://localhost/postgres",
    "https://localhost/fuctura_test",
    "postgresql://localhost/fuctura_test?host=db.example.com",
  ])("recusa alvo não autorizado %s", (url) => {
    expect(() => assertTestDatabase(url)).toThrow();
  });
});
describe("conteúdo do diário", () => {
  test("conteúdo vazio não inventa tópicos nem links", () => {
    expect(parseTopicsList(null)).toEqual([]);
    expect(parseTopicsList("Nenhum tópico planejado registrado.")).toEqual([]);
    expect(parseMaterialsList("material legado sem URL")).toEqual([]);
  });
  test("converte tópicos legados numerados e com marcadores", () => {
    expect(parseTopicsList("1. Herança\n- extends\n• Exercício")).toEqual([
      "Herança",
      "extends",
      "Exercício",
    ]);
  });
  test("planejados e ministrados usam tipos e ordenação independentes", () => {
    const lesson = {
      contents: [
        { title: "Segundo", contentType: "PLANNED", orderIndex: 2 },
        { title: "Ensinado", contentType: "TAUGHT", orderIndex: 1 },
        { title: "Primeiro", contentType: "PLANNED", orderIndex: 1 },
      ],
    };
    expect(extractPlannedTopics(lesson)).toEqual(["Primeiro", "Segundo"]);
    expect(extractTaughtTopics(lesson)).toEqual(["Ensinado"]);
  });
  test("materiais recuperam título, URL, descrição e identidade", () => {
    expect(
      parseMaterialsList(
        JSON.stringify([
          {
            id: "link",
            title: " Java ",
            url: " https://dev.java/ ",
            description: " Aprenda ",
          },
        ]),
      ),
    ).toEqual([
      {
        id: "link",
        title: "Java",
        url: "https://dev.java/",
        description: "Aprenda",
      },
    ]);
  });
});
