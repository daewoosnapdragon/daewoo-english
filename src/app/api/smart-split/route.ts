import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cleanJsonResponse } from '@/lib/ai-prompts';
import Anthropic from '@anthropic-ai/sdk';
import { aiLimiter } from '@/lib/rate-limit';

export const maxDuration = 60;

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

  const { resource_id, page_texts, page_count, title } = await request.json();
  if (!resource_id || !page_texts?.length) {
    return NextResponse.json({ error: 'resource_id and page_texts required' }, { status: 400 });
  }

  const pagesStr = page_texts.map((t: string, i: number) =>
    `--- PAGE ${i + 1} ---\n${t.slice(0, 400)}`
  ).join('\n');

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Analyze this ${page_count}-page teaching resource packet: "${title}".

For each page or group of pages, classify it. Return ONLY a JSON object:
- "cover_page": page number (1-indexed) of the cover page, or null
- "junk_pages": array of page numbers (1-indexed) that should be REMOVED. These include:
  * Credits/attribution pages ("Created by...", "Thank you for purchasing", "Clip art by...")
  * Terms of use / license pages ("You may not...", "Single classroom use only")
  * Store/seller advertisement pages ("Visit my TPT store", "Follow me on...")
  * Blank or nearly blank pages
  * Cover pages with just a title and decorative graphics
  IMPORTANT: Be aggressive about identifying junk pages. Teachers only want the actual teaching content.
- "sections": array of CONTENT-ONLY sections (exclude junk pages), each with:
  - "start": start page (1-indexed)
  - "end": end page (1-indexed)
  - "title": DESCRIPTIVE title like "Topic: Activity Type" (e.g. "Kangaroos: Diagram Labeling Activity", "Synonyms: Cut and Paste Matching")
  - "type": "worksheet"|"answer_key"|"activity"|"passage"|"assessment"|"graphic_organizer"|"anchor_chart"|"reference"
  - "answer_key_for": if this is an answer key, which section index (0-based) it belongs to. null otherwise.

RULES:
- junk_pages should include ALL non-content pages (credits, terms, ads, blank, covers)
- sections should ONLY include actual teaching content - worksheets, passages, answer keys, activities
- Give DESCRIPTIVE titles (never "Page 1" or "Worksheet")
- Group multi-page worksheets/passages together as one section
- Identify and link answer keys to their matching worksheet
- Keep the topic in each title for clarity

${pagesStr}
Return ONLY valid JSON.`
      }],
    });

    const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    const result = cleanJsonResponse(rawText);

    return NextResponse.json({
      ...result,
      total_pages: page_count,
    });
  } catch (e: any) {
    console.error('Smart split error:', e);
    return NextResponse.json({ error: e.message || 'AI failed' }, { status: 500 });
  }
}
