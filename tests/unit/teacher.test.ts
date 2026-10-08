import { describe, expect, test } from "bun:test";
import { lessonTiming } from "../../lib/teacher-metrics";
describe("datas acadêmicas do professor", () => {
  test("próxima aula no mesmo dia considera o horário local", () => {
    expect(
      lessonTiming(
        new Date("2026-10-08T00:00:00Z"),
        "19:00 - 22:00",
        new Date("2026-10-08T20:00:00Z"),
      ),
    ).toEqual({ isPast: false, startsInFuture: true });
  });
  test("aula com horário passado não é a próxima; data não está passada", () => {
    expect(
      lessonTiming(
        new Date("2026-10-08T00:00:00Z"),
        "08:30 - 12:30",
        new Date("2026-10-08T20:00:00Z"),
      ),
    ).toEqual({ isPast: false, startsInFuture: false });
  });
  test("data passada não indica conclusão ou conteúdo ministrado", () => {
    expect(
      lessonTiming(
        new Date("2026-10-07T00:00:00Z"),
        "19:00 - 22:00",
        new Date("2026-10-08T20:00:00Z"),
      ),
    ).toEqual({ isPast: true, startsInFuture: false });
  });
  test("horário sem formato confiável preserva data real", () => {
    expect(
      lessonTiming(
        new Date("2099-01-01T12:00:00Z"),
        "A definir",
        new Date("2026-10-08T20:00:00Z"),
      ).startsInFuture,
    ).toBe(true);
  });
});
