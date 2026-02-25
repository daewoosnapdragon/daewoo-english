import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Update last_viewed_at
  await supabase
    .from('resources')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', params.id);

  // Get public URLs
  const resource = {
    ...data,
    thumbnail_url: data.thumbnail_path
      ? supabase.storage.from('resources').getPublicUrl(data.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(data.storage_path).data.publicUrl,
  };

  return NextResponse.json(resource);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const updates = await request.json();
  
  // Remove fields that shouldn't be updated directly
  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.storage_path;
  delete updates.file_hash;

  const { data, error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get resource to find storage path
  const { data: resource } = await supabase
    .from('resources')
    .select('storage_path, thumbnail_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete from storage
  const pathsToDelete = [resource.storage_path];
  if (resource.thumbnail_path) pathsToDelete.push(resource.thumbnail_path);
  await supabase.storage.from('resources').remove(pathsToDelete);

  // Delete children
  const { data: children } = await supabase
    .from('resources')
    .select('storage_path, thumbnail_path')
    .eq('parent_id', params.id);
  
  if (children?.length) {
    const childPaths = children.flatMap(c => 
      [c.storage_path, c.thumbnail_path].filter(Boolean)
    );
    if (childPaths.length) await supabase.storage.from('resources').remove(childPaths);
    await supabase.from('resources').delete().eq('parent_id', params.id);
  }

  // Delete resource record
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
