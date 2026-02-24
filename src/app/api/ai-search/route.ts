import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TOPICS, READING_SKILLS, VALID_CATEGORIES, RESOURCE_TYPES, cleanJsonResponse } from '@/lib/ai-prompts';

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  try {
    // Step 1: Use Claude to parse the natural language query into structured filters
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `A teacher is searching their resource library. Parse their request into search filters. Return ONLY valid JSON.

Request: "${query}"

Return:
{
  "search_terms": ["keyword1", "keyword2"],
  "category": one of ${JSON.stringify(VALID_CATEGORIES)} or "",
  "resource_type": one of ${JSON.stringify(RESOURCE_TYPES)} or "",
  "grade_level": "1"-"5" or "K" or "",
  "topics": up to 3 from ${JSON.stringify(TOPICS.slice(0, 20))} or [],
  "reading_skills": up to 3 from ${JSON.stringify(READING_SKILLS.slice(0, 15))} or [],
  "curriculum": "Into Reading" or "Thumbs Up" or "",
  "book_num": number or 0,
  "module_num": number or 0
}

Be generous with search_terms. Include synonyms and related words. For example "cause and effect worksheet for grade 2" should give search_terms ["cause", "effect", "cause and effect"] plus category "reading", resource_type "Worksheet", grade_level "2", reading_skills ["Cause & Effect"].
Return ONLY valid JSON.`
      }],
    });

    const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    const filters = cleanJsonResponse(rawText);

    // Step 2: Build Supabase query from parsed filters
    let dbQuery = supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false);

    // Apply filters
    if (filters.category) {
      dbQuery = dbQuery.eq('category', filters.category);
    }
    if (filters.resource_type) {
      dbQuery = dbQuery.eq('resource_type', filters.resource_type);
    }
    if (filters.grade_level) {
      dbQuery = dbQuery.contains('grade_levels', [filters.grade_level]);
    }
    if (filters.curriculum) {
      dbQuery = dbQuery.ilike('curriculum', `%${filters.curriculum}%`);
    }
    if (filters.book_num) {
      dbQuery = dbQuery.eq('book_num', filters.book_num);
    }
    if (filters.module_num) {
      dbQuery = dbQuery.eq('module_num', filters.module_num);
    }

    dbQuery = dbQuery.limit(50);
    const { data: filtered } = await dbQuery;

    // Step 3: Also do text search with search terms
    let textResults: any[] = [];
    if (filters.search_terms?.length) {
      const searchTerms = filters.search_terms.slice(0, 5);
      for (const term of searchTerms) {
        const { data } = await supabase
          .from('resources')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_hidden', false)
          .or(`title.ilike.%${term}%,summary.ilike.%${term}%,story_title.ilike.%${term}%,subcategory.ilike.%${term}%`)
          .limit(20);
        if (data) textResults.push(...data);
      }
    }

    // Step 4: Also search by topics and reading skills
    let topicResults: any[] = [];
    for (const topic of (filters.topics || []).slice(0, 3)) {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_hidden', false)
        .contains('topics', [topic])
        .limit(10);
      if (data) topicResults.push(...data);
    }
    for (const skill of (filters.reading_skills || []).slice(0, 3)) {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_hidden', false)
        .contains('reading_skills', [skill])
        .limit(10);
      if (data) topicResults.push(...data);
    }

    // Step 5: Deduplicate and merge results, prioritizing filtered matches
    const seen = new Set<string>();
    const merged: any[] = [];

    // Priority 1: Filtered results (matched category/type/grade)
    for (const r of (filtered || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
    }
    // Priority 2: Topic/skill matches
    for (const r of topicResults) {
      if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
    }
    // Priority 3: Text search matches
    for (const r of textResults) {
      if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
    }

    // Add public URLs
    const results = merged.slice(0, 30).map(r => ({
      ...r,
      thumbnail_url: r.thumbnail_path
        ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
        : null,
      file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
    }));

    return NextResponse.json({
      results,
      filters_used: filters,
      total: results.length,
    });
  } catch (e: any) {
    console.error('AI search error:', e);
    return NextResponse.json({ error: e.message || 'Search failed' }, { status: 500 });
  }
}
