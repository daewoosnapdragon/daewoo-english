import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource_ids } = await request.json();
  if (!resource_ids?.length) return NextResponse.json({});

  const { data } = await supabase
    .from('story_profiles')
    .select('resource_id')
    .eq('user_id', userId)
    .in('resource_id', resource_ids);

  const map: Record<string, boolean> = {};
  for (const row of data || []) {
    map[row.resource_id] = true;
  }
  return NextResponse.json(map);
}
