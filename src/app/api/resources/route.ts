import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { sanitizeIlike, sanitizeSearchInput } from '@/lib/sanitize';
import { Resource } from '@/types';

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  
  const topic = searchParams.get('topic');

  // Lightweight mode for grid/list views - skip heavy AI fields
  const lightweight = searchParams.get('fields') === 'light';
  // If topic filter is active, we need topics/sub_topics fields even in light mode
  const selectFields = lightweight
    ? `id, title, thumbnail_path, storage_path, file_type, file_size, page_count, category, resource_type, story_title, is_favorite, ai_processed, book_num, module_num, curriculum, created_at, updated_at${topic ? ', topics, sub_topics, reading_skills' : ''}`
    : '*';

  let query = supabase
    .from('resources')
    .select(selectFields)
    .eq('user_id', userId)
    .eq('is_hidden', false);

  // Filters
  const search = searchParams.get('search');
  if (search) {
    const safe = sanitizeIlike(sanitizeSearchInput(search));
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%,story_title.ilike.%${safe}%,teacher_notes.ilike.%${safe}%`);
    }
  }

  const category = searchParams.get('category');
  if (category) query = query.eq('category', category);

  const resourceType = searchParams.get('resource_type');
  if (resourceType) query = query.eq('resource_type', resourceType);

  const gradeLevel = searchParams.get('grade_level');
  if (gradeLevel) query = query.contains('grade_levels', [gradeLevel]);

  const curriculum = searchParams.get('curriculum');
  if (curriculum) query = query.ilike('curriculum', `%${sanitizeIlike(curriculum)}%`);

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
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Supabase can't infer return type when select() receives a variable (not a literal string),
  // so it falls back to GenericStringError. We've already handled the error case above,
  // so data is guaranteed to be the row array here.
  let resources = ((data || []) as unknown as Resource[]).map((r) => ({
    ...r,
    thumbnail_url: r.thumbnail_path 
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
    file_url: supabase.storage.from('resources').getPublicUrl(r.storage_path).data.publicUrl,
  }));

  // Post-fetch topic filtering (PostgREST .or() with .cs is unreliable)
  // Also checks reading_skills for skill-based auto-folders (e.g. "Main Idea", "Cause & Effect")
  if (topic) {
    resources = resources.filter((r: Resource & { topics?: string[]; sub_topics?: string[]; reading_skills?: string[] }) => {
      const topics = Array.isArray(r.topics) ? r.topics : [];
      const subTopics = Array.isArray(r.sub_topics) ? r.sub_topics : [];
      const skills = Array.isArray(r.reading_skills) ? r.reading_skills : [];
      const lowerTopic = topic.toLowerCase();
      return topics.some(t => t.toLowerCase() === lowerTopic)
        || subTopics.some(t => t.toLowerCase() === lowerTopic)
        || skills.some(s => s.toLowerCase() === lowerTopic);
    });
  }

  return NextResponse.json(resources);
}
