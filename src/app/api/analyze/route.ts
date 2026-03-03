import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { buildAnalyzePrompt, postProcessAnalysis, cleanJsonResponse } from '@/lib/ai-prompts';
import { parseBookModule } from '@/lib/utils';
import Anthropic from '@anthropic-ai/sdk';
import { aiLimiter } from '@/lib/rate-limit';

export const maxDuration = 90;

async function extractTextFromStorage(supabase: ReturnType<typeof createServerSupabase>, storagePath: string, fileType: string): Promise<string> {
  if (fileType === 'pdf') {
    try {
      const { data: fileData } = await supabase.storage.from('resources').download(storagePath);
      if (!fileData) return '';
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer, { max: 10 });
      return (parsed.text || '').slice(0, 8000);
    } catch (e) {
      console.error('PDF text extraction failed:', e);
      return '';
    }
  }
  
  if (fileType === 'presentation') {
    // For presentations, we can only rely on filename and any existing metadata
    return '';
  }

  // For images and docs, return empty - rely on filename
  return '';
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit AI calls
  const limited = aiLimiter.check(user.id);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { resource_id, text: providedText } = await request.json();
  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resource_id)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Extract text from the actual file if not provided
  let resourceText = providedText || '';
  if (!resourceText) {
    resourceText = await extractTextFromStorage(supabase, resource.storage_path, resource.file_type);
  }
  
  // Always include filename context even if we have text
  const filenameContext = `Filename: "${resource.original_filename}". `;
  if (!resourceText) {
    resourceText = filenameContext + `Title: ${resource.title}. File type: ${resource.file_type}.`;
  } else {
    resourceText = filenameContext + resourceText;
  }

  const { book, module: mod } = parseBookModule(resource.original_filename);
  const bookNum = resource.book_num || book;
  const moduleNum = resource.module_num || mod;

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildAnalyzePrompt(resourceText, resource.original_filename, bookNum, moduleNum);

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '';
    let result = cleanJsonResponse(rawText);
    result = postProcessAnalysis(result, resource.original_filename, bookNum, moduleNum);

    // Build update object
    const updates: Record<string, any> = { ai_processed: true };

    const stringFields = [
      'title', 'summary', 'resource_type', 'subject_area', 'difficulty_level',
      'story_title', 'suggested_group', 'category', 'subcategory', 'korean_ell_notes',
    ];
    for (const f of stringFields) {
      if (result[f] !== undefined) updates[f] = result[f];
    }

    const arrayFields = ['grade_levels', 'topics', 'reading_skills', 'standards', 'sub_topics'];
    for (const f of arrayFields) {
      if (result[f]?.length) updates[f] = result[f];
    }

    if (result.curriculum && !resource.curriculum) updates.curriculum = result.curriculum;
    if (result.book_num && !resource.book_num) updates.book_num = result.book_num;
    if (result.module_num && !resource.module_num) updates.module_num = result.module_num;
    if (result.sort_order !== undefined) updates.sort_order = result.sort_order;

    await supabase
      .from('resources')
      .update(updates)
      .eq('id', resource_id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true, result, updates });
  } catch (e: any) {
    console.error('AI analyze error:', e);
    return NextResponse.json({ error: e.message || 'AI failed' }, { status: 500 });
  }
}
