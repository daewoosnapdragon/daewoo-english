import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_hidden', false)
    .not('last_viewed_at', 'is', null)
    .order('last_viewed_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resources = (data || []).map(r => ({
    ...r,
    thumbnail_url: r.thumbnail_path
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
  }));

  return NextResponse.json(resources);
}
