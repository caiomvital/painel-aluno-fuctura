import { hash } from "bcryptjs";
export async function initialPasswordHash(
  password?: string,
  production = process.env.NODE_ENV === "production",
) {
  if (!password && !production) return hash("Password123!", 10); // legacy development-only fixtures
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw new Error("Informe uma senha inicial de 12 a 72 caracteres.");
  return hash(password, 10);
}
