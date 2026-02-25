import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource_id, book_num, module_num, story_title, sort_order } = await request.json();
  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const updates: Record<string, any> = {};

  if (book_num !== undefined) {
    updates.book_num = book_num;
    updates.module_num = module_num || 0;
    updates.curriculum = book_num > 0 ? `Into Reading ${book_num} Module ${module_num || 0}` : '';
  }

  if (story_title !== undefined) {
    updates.story_title = story_title;
    updates.suggested_group = story_title;
  }

  if (sort_order !== undefined) {
    updates.sort_order = sort_order;
  }

  const { data, error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', resource_id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
