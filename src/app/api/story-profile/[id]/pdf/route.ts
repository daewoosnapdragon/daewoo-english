import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { buildStoryProfilePdf } from '@/lib/pdf-builders';

export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('story_profiles')
    .select('*')
    .eq('resource_id', params.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 404 });

  const pdf = await buildStoryProfilePdf(profile, await PDFDocument.create());
  const pdfBytes = await pdf.save();
  const title = (profile.data?.title || profile.title || 'story-profile').replace(/[^a-zA-Z0-9 ]/g, '');

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${title}.pdf"`,
    },
  });
}
