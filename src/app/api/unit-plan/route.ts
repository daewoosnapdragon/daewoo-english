import { getEffectiveUser } from '@/lib/effective-user';
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cleanJsonResponse } from '@/lib/ai-prompts';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = parseInt(searchParams.get('book') || '0');
  const moduleNum = parseInt(searchParams.get('module') || '0');

  const { data } = await supabase
    .from('unit_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: 'No plan found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const { book_num, module_num, target_grade, focus_standards, pacing_weeks } = await request.json();
  if (!book_num || !module_num) {
    return NextResponse.json({ error: 'book_num and module_num required' }, { status: 400 });
  }

  // Get all resources for this module
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_num', book_num)
    .eq('module_num', module_num)
    .eq('is_hidden', false)
    .order('sort_order');

  if (!resources?.length) {
    return NextResponse.json({ error: 'No resources found for this module. Upload resources first.' }, { status: 400 });
  }

  // Get all story profiles for resources in this module
  const resourceIds = resources.map(r => r.id);
  const { data: profiles } = await supabase
    .from('story_profiles')
    .select('*')
    .eq('user_id', user.id)
    .in('resource_id', resourceIds);

  if (!profiles?.length) {
    return NextResponse.json({
      error: 'No story profiles found. Generate story profiles for each passage/story first, then create the unit plan.'
    }, { status: 400 });
  }

  // Build structured profile summaries
  const profileSummaries = profiles.map(p => {
    const d = p.data || {};
    return `
STORY: "${d.title || p.title}"
Author: ${d.author || 'Unknown'}
Genre: ${d.genre || 'Unknown'} | Structure: ${d.text_structure || 'Unknown'}
Themes: ${(d.themes || []).join(', ')}
Reading Skills: ${(d.reading_skills || []).join(', ')}
Standards: ${(d.standards || []).join(', ')}
Key Vocabulary: ${(d.vocabulary || []).map((v: any) => v.word).join(', ')}
Mentor Sentences: ${(d.mentor_sentences || []).map((m: any) => `"${m.sentence}" (${m.skill})`).join('; ')}
Grammar: ${(d.grammar_connections || []).join(', ')}
Phonics: ${(d.phonics_connections || []).join(', ')}
Writing: ${(d.writing_connections || []).join(', ')}
Discussion Prompts: ${(d.discussion_prompts || []).map((p: any) => p.prompt).join('; ')}
Text Features: ${(d.text_features || []).join(', ')}
Author's Craft: ${(d.authors_craft || []).join(', ')}
Word Work - Spelling: ${(d.word_work?.spelling_patterns || []).join(', ')}
Word Work - Morphology: ${(d.word_work?.morphology || []).map((m: any) => m.word).join(', ')}
Korean ELL Phonics: ${(d.korean_ell_connections?.phonics_alerts || []).join(', ')}
Korean ELL Grammar: ${(d.korean_ell_connections?.grammar_alerts || []).join(', ')}
Below Level: ${(d.differentiation?.below_level || []).join(', ')}
Above Level: ${(d.differentiation?.above_level || []).join(', ')}`;
  }).join('\n\n---\n');

  // Resource inventory (exclude Teaching Pal)
  const resourceList = resources
    .filter(r => r.resource_type !== 'Teaching Pal')
    .map(r => `- "${r.title}" [${r.resource_type || 'Other'}] ${r.story_title ? `(Story: ${r.story_title})` : ''}`)
    .join('\n');

  const gradeLabel = target_grade || '2';
  const standards = (focus_standards || []).join(', ');

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Create a UDL backwards design unit plan for Into Reading Book ${book_num}, Module ${module_num}.

TARGET: Grade ${gradeLabel}. Korean ELL students.
${standards ? `FOCUS STANDARDS: ${standards}` : ''}

STORY PROFILES:
${profileSummaries}

STUDENT RESOURCES (uploaded materials - DO NOT reference Teaching Pal):
${resourceList}

Return ONLY valid JSON with this structure:
{
  "title": "Module theme title",
  "module_overview": "2-3 sentences",
  "essential_questions": ["question 1", "question 2"],
  "enduring_understandings": ["understanding 1"],
  "standards": ["RL.${gradeLabel}.1", "RI.${gradeLabel}.2"],
  "stage1_goals": {
    "knowledge": ["specific from stories"],
    "skills": ["specific skills"],
    "dispositions": ["specific dispositions"]
  },
  "stage2_assessments": {
    "performance_task": {
      "title": "task name",
      "description": "description",
      "criteria": ["criterion 1"],
      "udl_options": ["option 1"]
    },
    "formative": [
      {"title": "name", "description": "desc", "story": "story name", "standards": ["RL.X.X"]}
    ]
  },
  "weekly_plan": [
    {
      "week": 1,
      "story": "Story Title",
      "focus": "weekly focus",
      "vocabulary": ["word1", "word2"],
      "mentor_sentence": "sentence from profile",
      "days": [
        {
          "day": "Mon",
          "lesson": "specific lesson description",
          "resources": ["resource title"],
          "ell_support": "specific Korean ELL support",
          "standard": "RL.X.X"
        }
      ]
    }
  ],
  "differentiation": {
    "below": ["strategy 1"],
    "above": ["strategy 1"],
    "korean_ell": ["specific support"]
  },
  "grammar_focus": ["skill 1"],
  "phonics_focus": ["pattern 1"],
  "writing_focus": ["connection 1"]
}

RULES:
- Use SPECIFIC content from the story profiles (actual vocab, sentences, skills).
- Reference student resources BY EXACT TITLE.
- Do NOT reference Teaching Pal or teacher edition materials.
- Every lesson must have a CCSS standard.
- Korean ELL supports must be specific to the text content.
- Keep it concise. Return ONLY valid JSON, no markdown.`
      }],
    });

    const rawText = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    const planData = cleanJsonResponse(rawText);

    // Delete old plan
    await supabase.from('unit_plans').delete()
      .eq('user_id', user.id).eq('book_num', book_num).eq('module_num', module_num);

    const { data: saved, error } = await supabase
      .from('unit_plans')
      .insert({
        user_id: user.id,
        book_num, module_num,
        title: planData.title || `Book ${book_num} Module ${module_num}`,
        data: planData,
        source_resource_ids: resourceIds,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(saved);
  } catch (e: any) {
    console.error('Unit plan error:', e);
    return NextResponse.json({ error: e.message || 'AI failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  await supabase.from('unit_plans').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
