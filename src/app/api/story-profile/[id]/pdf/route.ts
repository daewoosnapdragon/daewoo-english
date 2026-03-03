import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { buildStoryProfilePdf } from '@/lib/pdf-builders';

export const maxDuration = 30;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const { user, userId, supabase } = await getEffectiveUser();
    if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: dbError } = await supabase
      .from('story_profiles')
      .select('*')
      .eq('resource_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError) return NextResponse.json({ error: `DB error: ${dbError.message}` }, { status: 500 });
    if (!profile) return NextResponse.json({ error: 'No profile found for this resource' }, { status: 404 });

    const pdfDoc = await PDFDocument.create();
    const pdf = await buildStoryProfilePdf(profile, pdfDoc);
    const pdfBytes = await pdf.save();
    const title = (profile.data?.title || profile.title || 'story-profile').replace(/[^a-zA-Z0-9 ]/g, '');

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${title}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Story profile PDF error:', err);
    return NextResponse.json({ error: `PDF generation failed: ${err.message}` }, { status: 500 });
  }
}
