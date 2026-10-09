import { operationalLog } from '@/lib/operational-log';
import { pendingRegistrationMessage } from '@/lib/registration-input';
import { publicError } from '@/lib/operational-log';
import { takeLoginAttempt, clearLoginAttempts } from '@/lib/login-limiter';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { awardDailyLoginXp } from '@/lib/academic-service';
import { verifyPassword, createSessionToken, setSessionCookie, SessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 1024) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios para acessar a plataforma.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!takeLoginAttempt(normalizedEmail)) { operationalLog('auth.login.rate_limited'); return NextResponse.json({error:'Muitas tentativas. Tente novamente mais tarde.'},{status:429,headers:{'Retry-After':'600'}}); }

    // 1. Buscar User pelo email via Prisma
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        student: true,
        teacher: true,
        director: true,
        registration: { select: { status: true } },
      },
    });

    // Se o usuário não foi localizado no PostgreSQL, rejeitar com 401
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // 2. Validar passwordHash com bcrypt.compare (sem bypass, sem senhas curinga, sem fallback)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    if (user.registration && user.registration.status !== 'APPROVED') {
      return NextResponse.json({ error: pendingRegistrationMessage }, { status: 403 });
    }
    clearLoginAttempts(normalizedEmail);
    // 3. Utilizar exclusivamente o role armazenado no User
    const studentId = user.student ? user.student.id : undefined;
    const teacherId = user.teacher ? user.teacher.id : undefined;
    const directorId = user.director ? user.director.id : undefined;

    let loginXpAwarded = 0;

    // FASE 10: Se for aluno, conceder XP de login diário atomicamente no PostgreSQL
    if (user.role === 'ALUNO' && studentId) {
      try {
        const xpResult = await awardDailyLoginXp(studentId);
        if (xpResult.awarded) {
          loginXpAwarded = xpResult.xpAmount;
        }
      } catch (e) {
        operationalLog('auth.login.xp.failed', e);
      }
    }

    // 4. Emitir JWT com jose e manter cookie HTTP-Only fuctura_session
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId,
      teacherId,
      directorId,
      sessionVersion: user.sessionVersion,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      loginXpAwarded,
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: publicError(error, 'Erro interno no servidor de autenticação.', "auth.login.failed") },
      { status: 500 }
    );
  }
}
