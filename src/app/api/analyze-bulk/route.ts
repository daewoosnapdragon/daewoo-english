import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { buildAnalyzePrompt, postProcessAnalysis, cleanJsonResponse } from '@/lib/ai-prompts';
import { parseBookModule } from '@/lib/utils';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { ids, texts } = await request.json();
  // ids: string[], texts: Record<string, string> mapping resource_id -> extracted text

  if (!ids?.length) return NextResponse.json({ error: 'No resource IDs' }, { status: 400 });

  const client = new Anthropic({ apiKey });
  const results: { id: string; success: boolean; title?: string; error?: string }[] = [];

  for (const rid of ids) {
    try {
      const { data: resource } = await supabase
        .from('resources')
        .select('*')
        .eq('id', rid)
        .eq('user_id', user.id)
        .single();

      if (!resource) {
        results.push({ id: rid, success: false, error: 'Not found' });
        continue;
      }

      const text = texts?.[rid] || '';
      if (!text) {
        results.push({ id: rid, success: false, error: 'No text' });
        continue;
      }

      const { book, module: mod } = parseBookModule(resource.original_filename);
      const bookNum = resource.book_num || book;
      const moduleNum = resource.module_num || mod;

      const prompt = buildAnalyzePrompt(text, resource.original_filename, bookNum, moduleNum);
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '';
      let result = cleanJsonResponse(rawText);
      result = postProcessAnalysis(result, resource.original_filename, bookNum, moduleNum);

      const updates: Record<string, any> = { ai_processed: true };
      const stringFields = [
        'title', 'summary', 'resource_type', 'subject_area', 'difficulty_level',
        'story_title', 'suggested_group', 'category', 'subcategory', 'korean_ell_notes',
      ];
      for (const f of stringFields) {
        if (result[f]) updates[f] = result[f];
      }
      const arrayFields = ['grade_levels', 'topics', 'reading_skills', 'standards', 'sub_topics'];
      for (const f of arrayFields) {
        if (result[f]) updates[f] = result[f];
      }
      if (result.curriculum && !resource.curriculum) updates.curriculum = result.curriculum;
      if (result.book_num && !resource.book_num) updates.book_num = result.book_num;
      if (result.module_num && !resource.module_num) updates.module_num = result.module_num;
      if (result.sort_order !== undefined) updates.sort_order = result.sort_order;

      await supabase
        .from('resources')
        .update(updates)
        .eq('id', rid)
        .eq('user_id', user.id);

      results.push({ id: rid, success: true, title: result.title || '' });
    } catch (e: any) {
      results.push({ id: rid, success: false, error: e.message || 'Failed' });
    }
  }

  return NextResponse.json({ results });
}
