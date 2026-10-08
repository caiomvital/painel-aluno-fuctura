import { describe, expect, test } from "bun:test";
import {
  registrationInput,
  pendingRegistrationMessage,
} from "../../lib/registration-input";
const valid = {
  name: " Ana Silva ",
  email: " ANA@example.test ",
  course: "JAVA" as const,
  password: "senha123",
};
describe("cadastro público", () => {
  test("normaliza nome/e-mail e aceita senha123 sem exigir maiúscula ou símbolo", () => {
    expect(registrationInput(valid)).toEqual({
      ...valid,
      name: "Ana Silva",
      email: "ana@example.test",
    });
  });
  test("aceita limites 6/8 e somente números", () => {
    for (const password of ["abc123", "123456", "12345678", "senha123"])
      expect(registrationInput({ ...valid, password }).password).toBe(password);
  });
  test("recusa ausência de número e comprimentos fora de 6 a 8", () => {
    for (const password of ["abcde1xyz", "abc12", "abcdefgh", "ABCDEF", null])
      expect(() => registrationInput({ ...valid, password })).toThrow(
        "A senha deve ter",
      );
  });
  test("aceita somente os cursos pedidos, sem propriedades herdadas", () => {
    for (const course of ["JAVA", "PYTHON", "IA"] as const)
      expect(registrationInput({ ...valid, course }).course).toBe(course);
    for (const course of ["toString", "Java", "SQL", null])
      expect(() => registrationInput({ ...valid, course })).toThrow();
  });
  test("valida nome, e-mail e payload inválido", () => {
    for (const data of [
      null,
      {},
      { ...valid, name: "a" },
      { ...valid, email: "x" },
      { ...valid, email: "a b@example.test" },
    ])
      expect(() => registrationInput(data)).toThrow();
  });
  test("mensagem pendente exata", () =>
    expect(pendingRegistrationMessage).toBe(
      "Confirmação pendente, entre em contato com a Secretaria",
    ));
});
