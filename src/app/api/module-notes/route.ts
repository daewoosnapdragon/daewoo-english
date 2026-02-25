import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET module notes for a specific book/module/story
export async function GET(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = parseInt(searchParams.get('book') || '0');
  const moduleNum = parseInt(searchParams.get('module') || '0');
  const storyTitle = searchParams.get('story') || '';

  let query = supabase
    .from('module_notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .order('sort_order');

  if (storyTitle) {
    query = query.eq('story_title', storyTitle);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each note, fetch the linked resources
  const enriched = await Promise.all((data || []).map(async (note) => {
    const resourceIds = note.resource_ids || [];
    let resources: any[] = [];
    if (resourceIds.length > 0) {
      const { data: res } = await supabase
        .from('resources')
        .select('id, title, resource_type, file_type, thumbnail_path, storage_path')
        .in('id', resourceIds);
      resources = (res || []).map(r => ({
        ...r,
        thumbnail_url: r.thumbnail_path
          ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
          : null,
      }));
    }
    return { ...note, resources };
  }));

  return NextResponse.json(enriched);
}

// POST create new subfolder/note
export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { book_num, module_num, story_title, folder_name, notes } = body;

  const { data, error } = await supabase
    .from('module_notes')
    .insert({
      user_id: user.id,
      book_num: book_num || 0,
      module_num: module_num || 0,
      story_title: story_title || '',
      folder_name: folder_name || 'Notes',
      notes: notes || '',
      resource_ids: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT update a note (edit text, add/remove resources)
export async function PUT(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, folder_name, notes, add_resource_id, remove_resource_id } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Get existing
  const { data: existing } = await supabase
    .from('module_notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, any> = {};

  if (folder_name !== undefined) updates.folder_name = folder_name;
  if (notes !== undefined) updates.notes = notes;

  // Add resource
  if (add_resource_id) {
    const currentIds = existing.resource_ids || [];
    if (!currentIds.includes(add_resource_id)) {
      updates.resource_ids = [...currentIds, add_resource_id];
    }
  }

  // Remove resource
  if (remove_resource_id) {
    const currentIds = existing.resource_ids || [];
    updates.resource_ids = currentIds.filter((id: string) => id !== remove_resource_id);
  }

  const { data, error } = await supabase
    .from('module_notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE a subfolder
export async function DELETE(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await supabase.from('module_notes').delete().eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
