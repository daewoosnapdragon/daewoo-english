import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { buildUnitPlanPdf } from '@/lib/pdf-builders';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { user, userId, supabase } = await getEffectiveUser();
    if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bookNum = parseInt(searchParams.get('book') || '0');
    const moduleNum = parseInt(searchParams.get('module') || '0');

    if (!bookNum || !moduleNum) return NextResponse.json({ error: 'Missing book or module number' }, { status: 400 });

    const { data: plan, error: dbError } = await supabase
      .from('unit_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('book_num', bookNum)
      .eq('module_num', moduleNum)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError) return NextResponse.json({ error: `DB error: ${dbError.message}` }, { status: 500 });
    if (!plan) return NextResponse.json({ error: 'No unit plan found. Generate one first.' }, { status: 404 });

    const pdf = await buildUnitPlanPdf(plan, bookNum, moduleNum);
    const pdfBytes = await pdf.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="unit-plan-b${bookNum}-m${moduleNum}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Unit plan PDF error:', err);
    return NextResponse.json({ error: `PDF generation failed: ${err.message}` }, { status: 500 });
  }
}
