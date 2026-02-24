import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cleanTitle, getFileType, parseBookModule } from '@/lib/utils';

export const maxDuration = 30;

// Register a resource after the client has uploaded the file directly to Supabase Storage
export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { filename, storage_path, file_size, file_hash, page_count } = await request.json();

  if (!filename || !storage_path) {
    return NextResponse.json({ error: 'filename and storage_path required' }, { status: 400 });
  }

  // Check duplicate by hash
  if (file_hash) {
    const { data: existing } = await supabase
      .from('resources')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .eq('file_hash', file_hash)
      .limit(1);

    if (existing && existing.length > 0) {
      // Clean up the just-uploaded file since it's a dupe
      await supabase.storage.from('resources').remove([storage_path]);
      return NextResponse.json({ duplicate: true, existing: existing[0], filename });
    }
  }

  const title = cleanTitle(filename);
  const fileType = getFileType(filename);
  const { book, module: mod } = parseBookModule(filename);
  const curriculum = book > 0 && book <= 4 ? `Into Reading ${book} Module ${mod}` : '';

  const id = crypto.randomUUID();

  const { data: resource, error: dbError } = await supabase
    .from('resources')
    .insert({
      id,
      user_id: user.id,
      title,
      original_filename: filename,
      storage_path,
      file_type: fileType,
      file_size: file_size || 0,
      file_hash: file_hash || '',
      page_count: page_count || 1,
      curriculum,
      book_num: book <= 4 ? book : 0,
      module_num: book <= 4 ? mod : 0,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('resources').remove([storage_path]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const file_url = supabase.storage.from('resources').getPublicUrl(storage_path).data.publicUrl;
  return NextResponse.json({ ...resource, file_url }, { status: 201 });
}
