import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveUser } from '@/lib/effective-user';
import { parseBookModule } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find all resources that might need book tagging
  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, original_filename, title, curriculum, book_num, module_num, story_title')
    .eq('user_id', userId)
    .order('created_at');

  if (error || !resources) return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });

  let fixed = 0;
  let skipped = 0;
  const fixes: { id: string; title: string; book_num: number; module_num: number; source: string }[] = [];

  for (const r of resources) {
    // Skip if already properly tagged
    if (r.book_num && r.book_num > 0 && r.book_num <= 4 && r.module_num && r.module_num > 0) {
      skipped++;
      continue;
    }

    let bookNum = 0;
    let moduleNum = 0;
    let source = '';

    // Strategy 1: Parse from curriculum field (e.g. "Into Reading 1 Module 9")
    if (r.curriculum) {
      const m = r.curriculum.match(/Into Reading\s+(\d+)\s+Module\s+(\d+)/i);
      if (m) {
        bookNum = parseInt(m[1]);
        moduleNum = parseInt(m[2]);
        source = 'curriculum_field';
      }
    }

    // Strategy 2: Parse from original filename
    if (!bookNum && r.original_filename) {
      const parsed = parseBookModule(r.original_filename);
      if (parsed.book > 0 && parsed.book <= 4) {
        bookNum = parsed.book;
        moduleNum = parsed.module;
        source = 'filename';
      }
    }

    // Strategy 3: Parse from title (e.g. "IR 1.9 The Nest")
    if (!bookNum && r.title) {
      const m = r.title.match(/IR\s+(\d+)\.(\d+)/i);
      if (m) {
        bookNum = parseInt(m[1]);
        moduleNum = parseInt(m[2]);
        source = 'title_pattern';
      }
    }

    // Strategy 4: Title contains "Module X" with book hint
    if (!bookNum && r.title) {
      const m = r.title.match(/Module\s+(\d+)/i);
      if (m) {
        moduleNum = parseInt(m[1]);
        // Try to infer book from curriculum or other context
        if (r.curriculum?.match(/Into Reading\s+(\d+)/i)) {
          bookNum = parseInt(r.curriculum.match(/Into Reading\s+(\d+)/i)![1]);
          source = 'title_module_curriculum_book';
        }
      }
    }

    if (bookNum > 0 && bookNum <= 4 && moduleNum > 0) {
      const updates: Record<string, any> = { book_num: bookNum, module_num: moduleNum };
      if (!r.curriculum) {
        updates.curriculum = `Into Reading ${bookNum} Module ${moduleNum}`;
      }

      const { error: updateError } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', r.id);

      if (!updateError) {
        fixed++;
        fixes.push({ id: r.id, title: r.title, book_num: bookNum, module_num: moduleNum, source });
      }
    }
  }

  return NextResponse.json({
    total: resources.length,
    already_tagged: skipped,
    fixed,
    fixes: fixes.slice(0, 50), // Show first 50 for debugging
  });
}
