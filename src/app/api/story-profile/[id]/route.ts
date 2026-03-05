import { getEffectiveUser } from '@/lib/effective-user';
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cleanJsonResponse } from '@/lib/ai-prompts';
import Anthropic from '@anthropic-ai/sdk';
import { aiLimiter } from '@/lib/rate-limit';

export const maxDuration = 120;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('story_profiles')
    .select('*')
    .eq('resource_id', id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: 'No profile found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
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

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  // Extract text from the resource
  let resourceText = '';
  if (resource.file_type === 'pdf') {
    try {
      const { data: fileData } = await supabase.storage.from('resources').download(resource.storage_path);
      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(buffer, { max: 10 });
        resourceText = (parsed.text || '').slice(0, 5000);
      }
    } catch { /* skip */ }
  }

  if (!resourceText) {
    resourceText = `Title: ${resource.title}. Summary: ${resource.summary || ''}. Filename: ${resource.original_filename}`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Analyze this teaching resource text and create a comprehensive story/passage profile. Return ONLY valid JSON.

TEXT:
${resourceText}

Return this JSON structure:
{
  "title": "Story/passage title",
  "author": "Author name or unknown",
  "authors_purpose": "To inform/persuade/entertain/explain",
  "genre": "Realistic Fiction/Fantasy/Informational/Poetry/etc",
  "summary": "2-3 sentence summary",
  "themes": ["theme 1", "theme 2"],
  "text_structure": "cause_effect|compare_contrast|sequence|problem_solution|description",
  "text_features": ["headings", "bold words", "captions", "diagrams", "illustrations", "glossary"],
  "authors_craft": ["figurative language examples", "dialogue use", "sensory details", "repetition"],
  "grade_levels": ["2"],
  "reading_skills": ["Main Idea", "Cause and Effect"],
  "standards": ["RL.2.1", "RL.2.3"],

  "vocabulary": [
    {"word": "word", "definition": "definition", "tier": "Tier 2", "part_of_speech": "noun", "context_sentence": "sentence from text using the word"}
  ],

  "mentor_sentences": [
    {"sentence": "Exact sentence from text", "skill": "compound sentence|dialogue punctuation|adjective use|etc", "mini_lesson": "What to teach with this sentence"}
  ],

  "word_work": {
    "high_frequency": ["the", "said"],
    "spelling_patterns": ["CVC words", "long vowel"],
    "morphology": [{"word": "unhappy", "prefix": "un-", "root": "happy", "meaning": "not happy"}]
  },

  "questions": [
    {"question": "text", "type": "multiple_choice", "dok": 1, "choices": ["A", "B", "C", "D"], "answer": "B"},
    {"question": "text", "type": "short_answer", "dok": 2, "answer": "model answer"}
  ],

  "discussion_prompts": [
    {"prompt": "Socratic discussion question", "follow_up": "Deeper follow-up question", "skill": "inferencing|evaluation|synthesis"}
  ],

  "writing_prompts": [
    {"genre": "opinion|narrative|informational", "prompt": "prompt text", "sentence_starters": ["I think...", "In my opinion..."]}
  ],

  "differentiation": {
    "below_level": ["strategy 1"],
    "above_level": ["strategy 1"],
    "ell_supports": ["strategy 1"]
  },

  "grammar_connections": ["subject-verb agreement", "commas in a series"],
  "phonics_connections": ["long a patterns", "r-controlled vowels"],
  "writing_connections": ["opinion writing", "using evidence"],

  "korean_ell_connections": {
    "phonics_alerts": ["L/R confusion: 'light' vs 'right'"],
    "grammar_alerts": ["No articles in Korean - practice a/an/the"],
    "cultural_connections": ["Connection to Korean culture if any"],
    "sentence_focus": ["SVO order practice sentences"]
  }
}

RULES:
- Be SPECIFIC, not vague. Every item should be actionable for a teacher.
- Mentor sentences must be actual sentences from the text (or close approximations).
- Vocabulary should be 6-10 words with real context sentences.
- Questions should span DOK 1-3 with at least one DOK 3.
- Discussion prompts should provoke real thinking, not yes/no answers.
- Standards should be specific CCSS codes.
- Korean ELL connections should reference actual phonemes and grammar patterns in the text.
- Return ONLY valid JSON.`
      }],
    });

    const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    const profileData = cleanJsonResponse(rawText);

    // Delete old profile if exists
    await supabase.from('story_profiles').delete()
      .eq('resource_id', id).eq('user_id', user.id);

    // Save new profile
    const { data: saved, error } = await supabase
      .from('story_profiles')
      .insert({
        user_id: user.id,
        resource_id: id,
        title: profileData.title || resource.story_title || resource.title,
        author: profileData.author || '',
        curriculum: resource.curriculum || '',
        data: profileData,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update resource with extracted info for searchability
    const updates: Record<string, any> = {};
    if (profileData.themes?.length) updates.topics = profileData.themes;
    if (profileData.reading_skills?.length) updates.reading_skills = profileData.reading_skills;
    if (profileData.standards?.length) updates.standards = profileData.standards;
    await supabase.from('resources').update(updates).eq('id', id);

    return NextResponse.json(saved);
  } catch (e: any) {
    console.error('Story profile error:', e);
    return NextResponse.json({ error: e.message || 'AI failed' }, { status: 500 });
  }
}

// PUT update an existing story profile (inline edits)
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Find the existing profile
  const { data: existing } = await supabase
    .from('story_profiles')
    .select('*')
    .eq('resource_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!existing) return NextResponse.json({ error: 'No profile found' }, { status: 404 });

  // Merge updates into existing data
  const updatedData = { ...existing.data, ...body.data };

  const { data: saved, error } = await supabase
    .from('story_profiles')
    .update({ data: updatedData, title: body.title || existing.title })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(saved);
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('story_profiles').delete()
    .eq('resource_id', id).eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
