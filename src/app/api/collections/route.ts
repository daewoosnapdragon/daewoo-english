import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET all collections
export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: collections } = await supabase
    .from('collections')
    .select('*, collection_resources(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

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

  const { name, description, color } = await request.json();

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: name || 'New Collection',
      description: description || '',
      color: color || '#e8734a',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
