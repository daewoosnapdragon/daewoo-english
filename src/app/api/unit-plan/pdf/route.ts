import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { buildUnitPlanPdf } from '@/lib/pdf-builders';

export const maxDuration = 30;

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = parseInt(searchParams.get('book') || '0');
  const moduleNum = parseInt(searchParams.get('module') || '0');

  const { data: plan } = await supabase
    .from('unit_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!plan) return NextResponse.json({ error: 'No plan found' }, { status: 404 });

  const pdf = await buildUnitPlanPdf(plan, bookNum, moduleNum);
  const pdfBytes = await pdf.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="unit-plan-b${bookNum}-m${moduleNum}.pdf"`,
    },
  });
}
