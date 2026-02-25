import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

export async function GET() {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Single query — only select the fields we need for counting
  const { data, error } = await supabase
    .from('resources')
    .select('category, is_favorite, curriculum')
    .eq('user_id', userId)
    .eq('is_hidden', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = { total: data?.length || 0, favorites: 0 };
  for (const r of data || []) {
    if (r.is_favorite) counts.favorites++;
    if (r.category) counts[r.category] = (counts[r.category] || 0) + 1;
    if (r.curriculum?.includes('Into Reading')) counts.into_reading = (counts.into_reading || 0) + 1;
  }

  return NextResponse.json(counts);
}
