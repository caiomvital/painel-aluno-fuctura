import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPanelTasks } from '@/lib/panel-tasks';
import { publicError } from '@/lib/operational-log';
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  try { return NextResponse.json(await getPanelTasks(session)); }
  catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao consultar pendências.', 'tasks.read.failed') }, { status: 500 }); }
}
