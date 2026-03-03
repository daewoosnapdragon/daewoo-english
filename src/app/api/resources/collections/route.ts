import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveUser } from '@/lib/effective-user';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json([], { status: 401 });

  const category = request.nextUrl.searchParams.get('category') || '';

  // 1. Get explicit collections for this category
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name')
    .eq('user_id', userId)
    .eq('category', category)
    .order('name');

  const results: { id: string; name: string; count: number; type: 'collection' | 'auto' }[] = [];

  // Count resources per explicit collection in a single query (instead of N+1)
  if (collections && collections.length > 0) {
    const collectionIds = collections.map((c: any) => c.id);
    const { data: allLinks } = await supabase
      .from('resources')
      .select('collection_id')
      .eq('user_id', userId)
      .in('collection_id', collectionIds);

    const countMap: Record<string, number> = {};
    for (const link of (allLinks || [])) {
      countMap[link.collection_id] = (countMap[link.collection_id] || 0) + 1;
    }

    for (const col of collections) {
      results.push({ id: col.id, name: col.name, count: countMap[col.id] || 0, type: 'collection' });
    }
  }

  // 2. Auto-group by AI-extracted topics within this category
  if (category) {
    const { data: resources } = await supabase
      .from('resources')
      .select('topics, sub_topics')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('ai_processed', true);

    if (resources?.length) {
      const topicCounts: Record<string, number> = {};
      // Prefer sub_topics (more specific like "Adjectives", "Pronouns")
      // Fall back to topics if sub_topics is empty
      for (const r of resources) {
        const tags: string[] = [];
        if (r.sub_topics && Array.isArray(r.sub_topics) && r.sub_topics.length > 0) {
          tags.push(...r.sub_topics);
        } else if (r.topics && Array.isArray(r.topics) && r.topics.length > 0) {
          tags.push(...r.topics);
        }
        for (const t of tags) {
          // Skip topics that match the category name itself
          if (t.toLowerCase() === category.toLowerCase()) continue;
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        }
      }
      // Only show groups with 2+ resources, don't duplicate manual folder names
      const existingNames = new Set(results.map(r => r.name.toLowerCase()));
      for (const [topic, count] of Object.entries(topicCounts)) {
        if (count >= 2 && !existingNames.has(topic.toLowerCase())) {
          results.push({ id: `auto:topic:${topic}`, name: topic, count, type: 'auto' });
        }
      }
    }
  }

  // Sort: explicit collections first, then auto
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'collection' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // If we have few auto-folders, seed with predefined skill taxonomy
  const CATEGORY_SKILLS: Record<string, string[]> = {
    reading: ['Main Idea', 'Author\'s Purpose', 'Cause & Effect', 'Compare & Contrast', 'Sequence', 'Inference', 'Text Structure', 'Point of View', 'Theme', 'Summarizing'],
    grammar: ['Nouns', 'Verbs', 'Adjectives', 'Adverbs', 'Pronouns', 'Punctuation', 'Sentences', 'Subject-Verb Agreement', 'Capitalization'],
    writing: ['Narrative', 'Opinion', 'Informational', 'Research', 'Poetry', 'Revising & Editing', 'Sentence Structure'],
    phonics: ['Short Vowels', 'Long Vowels', 'Blends', 'Digraphs', 'R-Controlled', 'Syllables', 'Prefixes & Suffixes', 'Sight Words'],
    assessments: ['Reading', 'Grammar', 'Writing', 'Spelling', 'Vocabulary', 'Comprehension'],
    sel: ['Self-Awareness', 'Self-Management', 'Social Awareness', 'Relationship Skills', 'Decision Making'],
  };

  if (category && CATEGORY_SKILLS[category]) {
    const existingNames = new Set(results.map(r => r.name.toLowerCase()));
    for (const skill of CATEGORY_SKILLS[category]) {
      if (!existingNames.has(skill.toLowerCase())) {
        // Check if any resources match this skill via reading_skills, topics, or sub_topics
        results.push({ id: `auto:skill:${skill}`, name: skill, count: 0, type: 'auto' });
      }
    }
  }

  return NextResponse.json(results);
}
