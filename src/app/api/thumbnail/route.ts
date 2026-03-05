import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const maxDuration = 30;

const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 520;
const THUMB_QUALITY = 80;

/**
 * Optimize an image buffer into a WebP thumbnail.
 * Returns the optimized buffer and content type.
 */
async function optimizeThumbnail(buffer: Buffer): Promise<{ data: Buffer; contentType: string; ext: string }> {
  try {
    const optimized = await sharp(buffer)
      .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();
    return { data: optimized, contentType: 'image/webp', ext: 'webp' };
  } catch {
    // If sharp fails (e.g. unsupported format), return original
    return { data: buffer, contentType: 'image/png', ext: 'png' };
  }
}

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

    // Validate thumbnail path belongs to this user
    if (!storage_thumb_path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid thumbnail path' }, { status: 403 });
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
  const { data: optimized, contentType: thumbContentType, ext } = await optimizeThumbnail(imgBuffer);
  const thumbPath = `${user.id}/thumbs/${resourceId}.${ext}`;

  if (resource.thumbnail_path) {
    await supabase.storage.from('resources').remove([resource.thumbnail_path]);
  }

  await supabase.storage.from('resources').upload(thumbPath, optimized, {
    contentType: thumbContentType,
    upsert: true,
  });

  await supabase.from('resources').update({ thumbnail_path: thumbPath }).eq('id', resourceId);
  const thumbUrl = supabase.storage.from('resources').getPublicUrl(thumbPath).data.publicUrl;
  return NextResponse.json({ thumbnail_path: thumbPath, thumbnail_url: thumbUrl + '?t=' + Date.now() });
}
