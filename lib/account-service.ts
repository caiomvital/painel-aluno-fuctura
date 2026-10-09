import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';
import { passwordChangeInput, preferencesInput, readPreferences } from './panel-preferences';
import type { SessionUser } from './session-token';

export async function getAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, preferences: true } });
  return { name: user.name, email: user.email, preferences: readPreferences(user.preferences) };
}
export async function savePreferences(userId: string, value: unknown) {
  const preferences = preferencesInput(value);
  await prisma.user.update({ where: { id: userId }, data: { preferences } });
  return preferences;
}
export async function changePassword(session: SessionUser, value: unknown) {
  const input = passwordChangeInput(value);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { passwordHash: true, sessionVersion: true } });
  if (user.sessionVersion !== (session.sessionVersion ?? 0) || !await compare(input.currentPassword, user.passwordHash))
    throw Object.assign(new Error('Senha atual incorreta ou sessão expirada.'), { statusCode: 400 });
  const passwordHash = await hash(input.newPassword, 10);
  return prisma.$transaction(async tx => {
    // Compare-and-swap prevents two changes authenticated with the same old password.
    const updated = await tx.user.updateMany({ where: { id: session.id, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    if (updated.count !== 1) throw Object.assign(new Error('Senha alterada em outra sessão. Entre novamente.'), { statusCode: 409 });
    await tx.auditLog.create({ data: { actorId: session.id, actorName: session.name, action: 'Senha alterada', entityId: session.id, summary: 'Senha alterada pelo titular; sessões anteriores encerradas.' } });
    return { ...session, sessionVersion: user.sessionVersion + 1 };
  });
}
