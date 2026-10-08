export const pendingRegistrationMessage =
  "Confirmação pendente, entre em contato com a Secretaria";
export const registrationCourses = {
  JAVA: "Java",
  PYTHON: "Python",
  IA: "IA",
} as const;
export function registrationInput(value: unknown) {
  const data = value as Record<string, unknown> | null;
  if (
    !data ||
    typeof data.name !== "string" ||
    data.name.trim().length < 2 ||
    data.name.trim().length > 120
  )
    throw new Error("Informe seu nome (2 a 120 caracteres).");
  if (
    typeof data.email !== "string" ||
    data.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
  )
    throw new Error("Informe um e-mail válido.");
  if (
    typeof data.password !== "string" ||
    data.password.length < 6 ||
    data.password.length > 8 ||
    !/[0-9]/.test(data.password)
  )
    throw new Error(
      "A senha deve ter de 6 a 8 caracteres e pelo menos um número.",
    );
  if (
    typeof data.course !== "string" ||
    !Object.hasOwn(registrationCourses, data.course)
  )
    throw new Error("Selecione Java, Python ou IA.");
  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    course: data.course as keyof typeof registrationCourses,
  };
}
