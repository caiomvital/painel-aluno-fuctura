import { SignJWT, jwtVerify } from "jose";
import { authSecret } from "./production-config";
export type Role = "ALUNO" | "PROFESSOR" | "DIRETOR";
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId?: string;
  teacherId?: string;
  directorId?: string;
}
const issuer = "fuctura",
  audience = "fuctura-panel";
export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret());
}
export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      algorithms: ["HS256"],
      issuer,
      audience,
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (
      typeof payload.id !== "string" ||
      !payload.id ||
      payload.sub !== payload.id ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !["ALUNO", "PROFESSOR", "DIRETOR"].includes(String(payload.role))
    )
      return null;
    for (const key of ["studentId", "teacherId", "directorId"])
      if (payload[key] !== undefined && typeof payload[key] !== "string")
        return null;
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role as Role,
      studentId: payload.studentId as string | undefined,
      teacherId: payload.teacherId as string | undefined,
      directorId: payload.directorId as string | undefined,
    };
  } catch {
    return null;
  }
}
export function sessionCookieOptions(
  production = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
