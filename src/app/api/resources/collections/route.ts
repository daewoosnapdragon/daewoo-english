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

  // Count resources per explicit collection
  for (const col of (collections || [])) {
    const { count } = await supabase
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('collection_id', col.id);

    results.push({ id: col.id, name: col.name, count: count || 0, type: 'collection' });
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

  return NextResponse.json(results);
}
