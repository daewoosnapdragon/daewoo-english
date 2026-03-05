import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

export const maxDuration = 15;

export async function GET() {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lightFields = 'id, title, thumbnail_path, storage_path, file_type, file_size, page_count, category, resource_type, story_title, is_favorite, ai_processed, book_num, module_num, curriculum, created_at, updated_at';

  // Fire all three queries in parallel — one cold start, three parallel DB calls
  const [resourcesResult, recentResult, countsResult] = await Promise.all([
    // Main resources (latest 100)
    supabase
      .from('resources')
      .select(lightFields)
      .eq('user_id', userId)
      .eq('is_hidden', false)
      .order('updated_at', { ascending: false })
      .limit(100),

    // Recent (last viewed)
    supabase
      .from('resources')
      .select(lightFields)
      .eq('user_id', userId)
      .eq('is_hidden', false)
      .not('last_viewed_at', 'is', null)
      .order('last_viewed_at', { ascending: false })
      .limit(20),

    // Counts (minimal fields + attention fields)
    supabase
      .from('resources')
      .select('category, is_favorite, curriculum, ai_processed, page_count')
      .eq('user_id', userId)
      .eq('is_hidden', false),
  ]);

  // Build URLs
  const addUrls = (data: any[]) => (data || []).map(r => ({
    ...r,
    thumbnail_url: r.thumbnail_path
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
  }));

  // Build counts
  const counts: Record<string, number> = { total: 0, favorites: 0, untagged: 0, no_category: 0, packets: 0 };
  for (const r of countsResult.data || []) {
    counts.total++;
    if (r.is_favorite) counts.favorites++;
    if (r.category) counts[r.category] = (counts[r.category] || 0) + 1;
    if (r.curriculum?.includes('Into Reading')) counts.into_reading = (counts.into_reading || 0) + 1;
    if (!r.ai_processed) counts.untagged++;
    if (!r.category) counts.no_category++;
    if (r.page_count > 3) counts.packets++;
  }

  return NextResponse.json({
    resources: addUrls(resourcesResult.data || []),
    recent: addUrls(recentResult.data || []),
    counts,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  });
}
