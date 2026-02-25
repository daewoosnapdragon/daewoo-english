import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  
  const topic = searchParams.get('topic');

  // Lightweight mode for grid/list views - skip heavy AI fields
  const lightweight = searchParams.get('fields') === 'light';
  // If topic filter is active, we need topics/sub_topics fields even in light mode
  const selectFields = lightweight
    ? `id, title, thumbnail_path, storage_path, file_type, file_size, page_count, category, resource_type, story_title, is_favorite, ai_processed, book_num, module_num, curriculum, created_at, updated_at${topic ? ', topics, sub_topics' : ''}`
    : '*';

  let query = supabase
    .from('resources')
    .select(selectFields)
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

  // Topic filtering is done post-fetch below since PostgREST .or() with .cs is unreliable

  const skill = searchParams.get('reading_skill');
  if (skill) query = query.contains('reading_skills', [skill]);

  const favoritesOnly = searchParams.get('favorites');
  if (favoritesOnly === 'true') query = query.eq('is_favorite', true);

  const collectionId = searchParams.get('collection_id');
  if (collectionId) query = query.eq('collection_id', collectionId);

  // Sort
  const sort = searchParams.get('sort') || 'updated_at';
  const order = searchParams.get('order') || 'desc';
  
  if (curriculum) {
    query = query.order('book_num').order('module_num').order('sort_order').order('title');
  } else {
    query = query.order(sort, { ascending: order === 'asc' });
  }

  // Limit
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 2000);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add public URLs for thumbnails
  let resources = (data || []).map((r: any) => ({
    ...r,
    thumbnail_url: r.thumbnail_path 
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
  }));

  // Post-fetch topic filtering (PostgREST .or() with .cs is unreliable)
  if (topic) {
    resources = resources.filter((r: any) => {
      const topics = Array.isArray(r.topics) ? r.topics : [];
      const subTopics = Array.isArray(r.sub_topics) ? r.sub_topics : [];
      return topics.includes(topic) || subTopics.includes(topic);
    });
  }

  return NextResponse.json(resources);
}
