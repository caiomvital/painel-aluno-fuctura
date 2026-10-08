import { publicError } from '@/lib/operational-log';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateGamificationRuleByDirector } from '@/lib/academic-service';

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const { ruleCode, xpValue } = await req.json();
    if (!ruleCode || xpValue === undefined) {
      return NextResponse.json({ error: 'Código da regra e valor de XP são obrigatórios.' }, { status: 400 });
    }

    const updatedRule = await updateGamificationRuleByDirector(ruleCode, Number(xpValue));
    return NextResponse.json({ success: true, rule: updatedRule });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao atualizar regra de gamificação.', "director.gamification.failed") }, { status: 400 });
  }
}
