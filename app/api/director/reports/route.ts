import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReport, toCsv, reportFilters } from '@/lib/report-data';
import { publicError } from '@/lib/operational-log';
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'DIRETOR') return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  try { reportFilters(params); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    const result = await getReport(params);
    if (params.get('format') === 'csv') return new NextResponse(toCsv(result.columns, result.rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="fuctura-${params.get('type') || 'attendance'}.csv"` } });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao gerar relatório. Selecione uma turma ou temporada e reduza o período.', 'reports.read.failed') }, { status: 500 }); }
}
