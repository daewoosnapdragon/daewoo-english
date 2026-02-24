import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET collection with its resources
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get resources in this collection
  const { data: links } = await supabase
    .from('collection_resources')
    .select('resource_id, sort_order')
    .eq('collection_id', params.id)
    .order('sort_order');

  const resourceIds = (links || []).map(l => l.resource_id);
  let resources: any[] = [];
  if (resourceIds.length) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .in('id', resourceIds);
    resources = (data || []).map(r => ({
      ...r,
      thumbnail_url: r.thumbnail_path
        ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
        : null,
    }));
  }

  return NextResponse.json({ ...collection, resources });
}

// PUT update collection
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const updates = await request.json();

  // Handle adding/removing resources
  if (updates.add_resource_id) {
    const { error } = await supabase
      .from('collection_resources')
      .insert({
        collection_id: params.id,
        resource_id: updates.add_resource_id,
      });
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (updates.remove_resource_id) {
    await supabase
      .from('collection_resources')
      .delete()
      .eq('collection_id', params.id)
      .eq('resource_id', updates.remove_resource_id);
    return NextResponse.json({ success: true });
  }

  // Regular field update
  delete updates.add_resource_id;
  delete updates.remove_resource_id;

  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE collection
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
