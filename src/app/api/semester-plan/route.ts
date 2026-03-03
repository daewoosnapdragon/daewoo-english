import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { parseSemesterPlan } from '@/lib/semester-plan-parser';

export const maxDuration = 60;

// ── GET: Retrieve semester plan for a module ──
export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = parseInt(searchParams.get('book') || '0');
  const moduleNum = parseInt(searchParams.get('module') || '0');

  const { data } = await supabase
    .from('semester_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: 'No semester plan found' }, { status: 404 });
  return NextResponse.json(data);
}

// ── POST: Upload .docx, parse, and save ──
export async function POST(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bookNum = parseInt(formData.get('book_num') as string || '0');
  const moduleNum = parseInt(formData.get('module_num') as string || '0');
  const title = formData.get('title') as string || '';
  const semester = formData.get('semester') as string || 'Spring';
  const grade = formData.get('grade') as string || '1';

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!bookNum || !moduleNum) {
    return NextResponse.json({ error: 'book_num and module_num required' }, { status: 400 });
  }

  try {
    // Step 1: Convert .docx to markdown
    const markdown = await convertDocxToMarkdown(file);

    // Step 2: Parse markdown into structured plan data
    const planData = parseSemesterPlan(markdown);

    // Step 3: Calculate total weeks from parsed data
    const totalWeeks = planData.weekly_skeleton.length || 15;

    // Step 4: Generate a title if not provided
    const planTitle = title
      || planData.unit_overview?.description?.slice(0, 60)
      || `Semester Plan — Book ${bookNum}, Module ${moduleNum}`;

    // Step 5: Delete existing plan for this module (replace strategy)
    await supabase
      .from('semester_plans')
      .delete()
      .eq('user_id', userId)
      .eq('book_num', bookNum)
      .eq('module_num', moduleNum);

    // Step 6: Save new plan
    const { data: saved, error } = await supabase
      .from('semester_plans')
      .insert({
        user_id: userId,
        book_num: bookNum,
        module_num: moduleNum,
        title: planTitle,
        semester,
        grade,
        total_weeks: totalWeeks,
        plan_data: planData,
        source_filename: file.name,
      })
      .select()
      .single();

    if (error) {
      console.error('Semester plan save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the saved plan with parse stats
    return NextResponse.json({
      ...saved,
      parse_stats: {
        stories: planData.stories.length,
        total_lessons: planData.stories.reduce((sum, s) => sum + s.lessons.length, 0),
        phonics_phases: planData.phonics_scope.length,
        pa_weeks: planData.pa_scope.length,
        grammar_weeks: planData.grammar_scope.length,
        skeleton_weeks: planData.weekly_skeleton.length,
        integration_rows: planData.integration_map.length,
      }
    });
  } catch (e: any) {
    console.error('Semester plan upload error:', e);
    return NextResponse.json({ error: e.message || 'Failed to parse plan' }, { status: 500 });
  }
}

// ── PATCH: Update plan data (in-app edits) ──
export async function PATCH(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, plan_data, title } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (plan_data) updates.plan_data = plan_data;
  if (title) updates.title = title;

  const { data, error } = await supabase
    .from('semester_plans')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: Remove a semester plan ──
export async function DELETE(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  await supabase.from('semester_plans').delete().eq('id', id).eq('user_id', userId);
  return NextResponse.json({ success: true });
}

// ═══════════════════════════════════════════════════════════════
// DOCX TO MARKDOWN CONVERSION
// Uses mammoth.js (pure JS, no system dependencies)
// Converts .docx to HTML, then transforms to lightweight markdown
// ═══════════════════════════════════════════════════════════════

async function convertDocxToMarkdown(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    const mammoth = (await import('mammoth')).default || await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer });

    // Convert HTML to a simplified markdown the parser can handle
    let md = result.value;

    // Replace HTML heading tags with markdown headings
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');

    // Bold and italic
    md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');

    // Lists
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '+ $1');
    md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

    // Paragraphs and breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<\/p>/gi, '\n\n');
    md = md.replace(/<p[^>]*>/gi, '');

    // Tables: convert to pipe-delimited markdown tables
    md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent: string) => {
      const rows: string[] = [];
      const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      rowMatches.forEach((row, ri) => {
        const cells: string[] = [];
        const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        cellMatches.forEach(cell => {
          const text = cell.replace(/<[^>]+>/g, '').trim();
          cells.push(text);
        });
        rows.push('| ' + cells.join(' | ') + ' |');
        if (ri === 0) {
          rows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
        }
      });
      return '\n' + rows.join('\n') + '\n';
    });

    // Strip remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&ndash;/g, '--');
    md = md.replace(/&mdash;/g, '---');

    // Clean up excessive whitespace
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
  } catch (e: any) {
    console.error('Mammoth conversion failed:', e.message);
    throw new Error('Could not convert .docx file: ' + (e.message || 'Unknown error'));
  }
}
