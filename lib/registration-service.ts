import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import { registrationInput } from "./registration-input";
const failure = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });
const summary = {
  id: true,
  course: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  user: { select: { name: true, email: true, role: true } },
} as const;
export async function requestRegistration(body: unknown) {
  const data = registrationInput(body);
  const passwordHash = await hash(data.password, 10);
  // No student, enrollment, session or reward exists until approval.
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "ALUNO",
      profile: { create: {} },
      registration: { create: { course: data.course } },
    },
    select: { registration: { select: { id: true, status: true } } },
  });
  return user.registration;
}
export async function listRegistrations(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
  if (actor?.role !== "DIRETOR")
    throw failure("Acesso restrito à direção.", 403);
  return prisma.registrationRequest.findMany({
    select: summary,
    orderBy: { createdAt: "desc" },
  });
}
export async function reviewRegistration(
  actorId: string,
  id: string,
  decision: string,
  role?: string,
) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100 ||
    !["APPROVED", "REJECTED"].includes(decision)
  )
    throw failure("Solicitação ou decisão inválida.", 400);
  if (decision === "APPROVED" && !["ALUNO", "PROFESSOR"].includes(role ?? ""))
    throw failure("Selecione o perfil Aluno ou Professor.", 400);
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (actor?.role !== "DIRETOR")
      throw failure("Acesso restrito à direção.", 403);
    // Lock ensures concurrent approvals create exactly one student; rejection is terminal.
    await tx.$queryRaw`SELECT id FROM "RegistrationRequest" WHERE id = ${id} FOR UPDATE`;
    const request = await tx.registrationRequest.findUnique({
      where: { id },
      include: { user: { select: { role: true } } },
    });
    if (!request) throw failure("Solicitação não encontrada.", 404);
    if (request.status === decision) {
      if (decision === "APPROVED" && request.user.role !== role)
        throw failure("Cadastro já aprovado com outro perfil.", 409);
      return tx.registrationRequest.findUniqueOrThrow({
        where: { id },
        select: summary,
      });
    }
    if (request.status !== "PENDING")
      throw failure("Solicitação já resolvida.", 409);
    if (request.user.role !== "ALUNO")
      throw failure("Perfil incompatível.", 409);
    if (decision === "APPROVED" && role === "ALUNO")
      await tx.student.create({
        data: {
          userId: request.userId,
          registrationNumber: `CAD-${request.id}`,
          streak: { create: {} },
        },
      });
    if (decision === "APPROVED" && role === "PROFESSOR")
      await tx.teacher.create({ data: { userId: request.userId } });
    if (decision === "APPROVED")
      await tx.user.update({
        where: { id: request.userId },
        data: { role: role as "ALUNO" | "PROFESSOR" },
      });
    // Model defaults start XP/Coins at zero. Only the existing login/presence services award rewards.
    return tx.registrationRequest.update({
      where: { id },
      data: {
        status: decision as "APPROVED" | "REJECTED",
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      select: summary,
    });
  });
}
