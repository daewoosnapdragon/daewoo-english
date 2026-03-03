import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

// GET page assignments — optionally filter by module or resource
export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = searchParams.get('book');
  const moduleNum = searchParams.get('module');
  const resourceId = searchParams.get('resource_id');

  let query = supabase
    .from('page_assignments')
    .select('*, resources(id, title, storage_path, file_type, thumbnail_path, page_count)')
    .eq('user_id', userId)
    .order('sort_order')
    .order('page_start');

  if (bookNum) query = query.eq('book_num', parseInt(bookNum));
  if (moduleNum) query = query.eq('module_num', parseInt(moduleNum));
  if (resourceId) query = query.eq('resource_id', resourceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add thumbnail URLs
  const assignments = (data || []).map(a => ({
    ...a,
    resources: a.resources ? {
      ...a.resources,
      thumbnail_url: a.resources.thumbnail_path
        ? supabase.storage.from('resources').getPublicUrl(a.resources.thumbnail_path).data.publicUrl
        : null,
      file_url: supabase.storage.from('resources').getPublicUrl(a.resources.storage_path).data.publicUrl,
    } : null,
  }));

  return NextResponse.json(assignments);
}

// POST create page assignment
export async function POST(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { resource_id, page_start, page_end, book_num, module_num, story_title, label, tags, sort_order } = body;

  if (!resource_id || !book_num || !module_num) {
    return NextResponse.json({ error: 'resource_id, book_num, and module_num required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('page_assignments')
    .insert({
      user_id: userId,
      resource_id,
      page_start: page_start || 1,
      page_end: page_end || page_start || 1,
      book_num,
      module_num,
      story_title: story_title || '',
      label: label || '',
      tags: tags || [],
      sort_order: sort_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE page assignment
export async function DELETE(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('page_assignments').delete().eq('id', id).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
