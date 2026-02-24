import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';

  // JSON body = { resource_id, storage_thumb_path } - client already uploaded to storage
  if (contentType.includes('application/json')) {
    const { resource_id, storage_thumb_path } = await request.json();
    if (!resource_id || !storage_thumb_path) {
      return NextResponse.json({ error: 'resource_id and storage_thumb_path required' }, { status: 400 });
    }

    const { data: resource } = await supabase
      .from('resources')
      .select('id, thumbnail_path')
      .eq('id', resource_id)
      .eq('user_id', user.id)
      .single();

    if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Remove old thumb if different path
    if (resource.thumbnail_path && resource.thumbnail_path !== storage_thumb_path) {
      await supabase.storage.from('resources').remove([resource.thumbnail_path]);
    }

    await supabase.from('resources').update({ thumbnail_path: storage_thumb_path }).eq('id', resource_id);
    const thumbUrl = supabase.storage.from('resources').getPublicUrl(storage_thumb_path).data.publicUrl;
    return NextResponse.json({ thumbnail_path: storage_thumb_path, thumbnail_url: thumbUrl + '?t=' + Date.now() });
  }

  // FormData body = custom image upload (small images only)
  const formData = await request.formData();
  const file = formData.get('thumbnail') as File | null;
  const resourceId = formData.get('resource_id') as string | null;

  if (!file || !resourceId) return NextResponse.json({ error: 'thumbnail and resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('id, thumbnail_path')
    .eq('id', resourceId)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const imgBuffer = Buffer.from(await file.arrayBuffer());
  const thumbPath = `${user.id}/thumbs/${resourceId}.png`;

  if (resource.thumbnail_path) {
    await supabase.storage.from('resources').remove([resource.thumbnail_path]);
  }

  await supabase.storage.from('resources').upload(thumbPath, imgBuffer, {
    contentType: file.type || 'image/png',
    upsert: true,
  });

  await supabase.from('resources').update({ thumbnail_path: thumbPath }).eq('id', resourceId);
  const thumbUrl = supabase.storage.from('resources').getPublicUrl(thumbPath).data.publicUrl;
  return NextResponse.json({ thumbnail_path: thumbPath, thumbnail_url: thumbUrl + '?t=' + Date.now() });
}
