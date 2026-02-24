import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the source resource
  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const seen = new Set<string>([params.id]);
  const similar: any[] = [];

  // Strategy 1: Same story group
  if (resource.story_title) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .eq('story_title', resource.story_title)
      .neq('id', params.id)
      .limit(10);
    for (const r of (data || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); similar.push({ ...r, match_reason: 'Same story' }); }
    }
  }

  // Strategy 2: Same module (for IR resources)
  if (resource.book_num && resource.module_num) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .eq('book_num', resource.book_num)
      .eq('module_num', resource.module_num)
      .neq('id', params.id)
      .order('sort_order')
      .limit(15);
    for (const r of (data || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); similar.push({ ...r, match_reason: 'Same module' }); }
    }
  }

  // Strategy 3: Matching reading skills
  const skills = resource.reading_skills || [];
  for (const skill of skills.slice(0, 3)) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .contains('reading_skills', [skill])
      .neq('id', params.id)
      .limit(5);
    for (const r of (data || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); similar.push({ ...r, match_reason: `Skill: ${skill}` }); }
    }
  }

  // Strategy 4: Matching topics
  const topics = resource.topics || [];
  for (const topic of topics.slice(0, 3)) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .contains('topics', [topic])
      .neq('id', params.id)
      .limit(5);
    for (const r of (data || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); similar.push({ ...r, match_reason: `Topic: ${topic}` }); }
    }
  }

  // Strategy 5: Same category + subcategory
  if (resource.category && resource.subcategory) {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .eq('category', resource.category)
      .eq('subcategory', resource.subcategory)
      .neq('id', params.id)
      .limit(5);
    for (const r of (data || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); similar.push({ ...r, match_reason: `${resource.subcategory}` }); }
    }
  }

  // Add public URLs
  const results = similar.slice(0, 15).map(r => ({
    ...r,
    thumbnail_url: r.thumbnail_path
      ? supabase.storage.from('resources').getPublicUrl(r.thumbnail_path).data.publicUrl
      : null,
  }));

  return NextResponse.json(results);
}
