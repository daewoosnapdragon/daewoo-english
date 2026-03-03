import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET all collections (optionally filter by category)
export async function GET(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let query = supabase
    .from('collections')
    .select('*, collection_resources(count)')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (category) query = query.eq('category', category);

  const { data: collections } = await query;

  const result = (collections || []).map(c => ({
    ...c,
    resource_count: c.collection_resources?.[0]?.count || 0,
  }));

  return NextResponse.json(result);
}

// POST create new collection
export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, color, category } = await request.json();

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: name || 'New Folder',
      description: description || '',
      color: color || '#f9a8d4',
      category: category || '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
