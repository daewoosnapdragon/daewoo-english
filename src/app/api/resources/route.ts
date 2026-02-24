import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  
  let query = supabase
    .from('resources')
    .select('*')
    .eq('user_id', userId)
    .eq('is_hidden', false);

  // Filters
  const search = searchParams.get('search');
  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,story_title.ilike.%${search}%,teacher_notes.ilike.%${search}%`);
  }

  const category = searchParams.get('category');
  if (category) query = query.eq('category', category);

  const resourceType = searchParams.get('resource_type');
  if (resourceType) query = query.eq('resource_type', resourceType);

  const gradeLevel = searchParams.get('grade_level');
  if (gradeLevel) query = query.contains('grade_levels', [gradeLevel]);

  const curriculum = searchParams.get('curriculum');
  if (curriculum) query = query.ilike('curriculum', `%${curriculum}%`);

  const book = searchParams.get('book');
  if (book) query = query.eq('book_num', parseInt(book));

  const topic = searchParams.get('topic');
  if (topic) query = query.contains('topics', [topic]);

  const skill = searchParams.get('reading_skill');
  if (skill) query = query.contains('reading_skills', [skill]);

  const favoritesOnly = searchParams.get('favorites');
  if (favoritesOnly === 'true') query = query.eq('is_favorite', true);

  // Sort
  const sort = searchParams.get('sort') || 'updated_at';
  const order = searchParams.get('order') || 'desc';
  
  if (curriculum) {
    query = query.order('book_num').order('module_num').order('sort_order').order('title');
  } else {
    query = query.order(sort, { ascending: order === 'asc' });
  }

  // Limit
  const limit = parseInt(searchParams.get('limit') || '100');
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add public URLs for thumbnails
  const resources = (data || []).map(r => ({
    ...r,
    thumbnail_url: r.thumbnail_path 
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
  }));

  return NextResponse.json(resources);
}
