import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  verifySessionToken,
  sessionCookieOptions,
  type SessionUser,
} from "./session-token";
import { operationalLog } from "./operational-log";
export { createSessionToken, verifySessionToken } from "./session-token";
export type { Role, SessionUser } from "./session-token";
const COOKIE_NAME = "fuctura_session";
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        student: { select: { id: true } },
        teacher: { select: { id: true } },
        director: { select: { id: true } },
      },
    });
    if (!user || user.role !== session.role) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.student?.id,
      teacherId: user.teacher?.id,
      directorId: user.director?.id,
    };
  } catch (error) {
    operationalLog("auth.session.database_unavailable", error);
    return null;
  }
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, sessionCookieOptions());
}
export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
