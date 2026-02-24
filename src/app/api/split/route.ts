import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource_id, sections, junk_pages, cover_page, mode } = await request.json();
  // mode: 'split' = split into sections, 'clean' = just remove junk pages and keep rest as one file

  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resource_id)
    .eq('user_id', user.id)
    .single();

  if (!resource || resource.file_type !== 'pdf') {
    return NextResponse.json({ error: 'Not a PDF resource' }, { status: 400 });
  }

  // Download the PDF
  const { data: fileData, error: dlError } = await supabase.storage
    .from('resources')
    .download(resource.storage_path);

  if (dlError || !fileData) {
    return NextResponse.json({ error: 'Could not download file' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  try {
    // Dynamic import pdf-lib for splitting
    const { PDFDocument } = await import('pdf-lib');
    const sourcePdf = await PDFDocument.load(buffer);
    const totalPages = sourcePdf.getPageCount();
    const junkSet = new Set((junk_pages || []).map((p: number) => p - 1)); // convert to 0-indexed

    if (mode === 'clean') {
      // Remove junk pages, save as single cleaned file
      const cleanPdf = await PDFDocument.create();
      const goodPages: number[] = [];
      
      for (let i = 0; i < totalPages; i++) {
        if (!junkSet.has(i)) goodPages.push(i);
      }

      if (goodPages.length === 0) {
        return NextResponse.json({ error: 'No pages would remain after cleaning' }, { status: 400 });
      }

      const copiedPages = await cleanPdf.copyPages(sourcePdf, goodPages);
      copiedPages.forEach(page => cleanPdf.addPage(page));

      const cleanedBytes = await cleanPdf.save();
      const cleanBuffer = Buffer.from(cleanedBytes);

      // Upload cleaned version, replacing original
      const { error: upError } = await supabase.storage
        .from('resources')
        .update(resource.storage_path, cleanBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (upError) {
        // If update fails, upload as new path
        const newPath = `${user.id}/${resource.id}-clean.pdf`;
        await supabase.storage.from('resources').upload(newPath, cleanBuffer, {
          contentType: 'application/pdf',
        });
        await supabase.from('resources').update({
          storage_path: newPath,
          page_count: goodPages.length,
          file_size: cleanBuffer.length,
        }).eq('id', resource_id);
      } else {
        await supabase.from('resources').update({
          page_count: goodPages.length,
          file_size: cleanBuffer.length,
        }).eq('id', resource_id);
      }

      return NextResponse.json({
        mode: 'clean',
        original_pages: totalPages,
        removed_pages: junkSet.size,
        remaining_pages: goodPages.length,
      });
    }

    // mode === 'split': create child resources for each section
    if (!sections?.length) {
      return NextResponse.json({ error: 'No sections provided' }, { status: 400 });
    }

    const created: { id: string; title: string; pages: string; type: string }[] = [];
    const now = new Date().toISOString();

    for (const section of sections) {
      const startIdx = Math.max(0, (section.start || 1) - 1);
      const endIdx = Math.min(totalPages, section.end || startIdx + 1);
      const sectionTitle = section.title || `Page ${startIdx + 1}`;
      const pageType = section.type || 'worksheet';
      const isJunk = pageType === 'credits' || pageType === 'terms_of_use' || pageType === 'blank' || pageType === 'cover';

      // Create PDF for this section
      const sectionPdf = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let i = startIdx; i < endIdx; i++) {
        pageIndices.push(i);
      }

      const copiedPages = await sectionPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => sectionPdf.addPage(page));

      const sectionBytes = await sectionPdf.save();
      const sectionBuffer = Buffer.from(sectionBytes);
      const hash = crypto.createHash('md5').update(sectionBuffer).digest('hex');

      // Upload section PDF
      const childId = crypto.randomUUID();
      const childPath = `${user.id}/${childId}.pdf`;

      const { error: secUpError } = await supabase.storage
        .from('resources')
        .upload(childPath, sectionBuffer, { contentType: 'application/pdf' });

      if (secUpError) {
        console.error('Section upload error:', secUpError);
        continue;
      }

      // Create child resource record (inheriting parent metadata)
      const { error: dbError } = await supabase
        .from('resources')
        .insert({
          id: childId,
          user_id: user.id,
          title: sectionTitle,
          original_filename: `${resource.original_filename.replace('.pdf', '')}_p${startIdx + 1}-${endIdx}.pdf`,
          storage_path: childPath,
          file_type: 'pdf',
          file_size: sectionBuffer.length,
          file_hash: hash,
          page_count: endIdx - startIdx,
          parent_id: resource_id,
          page_number: startIdx + 1,
          page_type: pageType,
          is_hidden: isJunk,
          // Inherit parent metadata
          summary: resource.summary || '',
          resource_type: resource.resource_type || '',
          subject_area: resource.subject_area || '',
          grade_levels: resource.grade_levels || [],
          topics: resource.topics || [],
          sub_topics: resource.sub_topics || [],
          reading_skills: resource.reading_skills || [],
          standards: resource.standards || [],
          difficulty_level: resource.difficulty_level || '',
          category: resource.category || '',
          subcategory: resource.subcategory || '',
          korean_ell_notes: resource.korean_ell_notes || '',
          curriculum: resource.curriculum || '',
          book_num: resource.book_num || 0,
          module_num: resource.module_num || 0,
          story_title: resource.story_title || '',
          suggested_group: resource.suggested_group || '',
        });

      if (dbError) {
        console.error('Child resource DB error:', dbError);
        continue;
      }

      created.push({
        id: childId,
        title: sectionTitle,
        pages: `${startIdx + 1}-${endIdx}`,
        type: pageType,
      });
    }

    // Link answer keys to their worksheets
    for (const section of sections) {
      if (section.answer_key_for !== null && section.answer_key_for !== undefined) {
        const akIndex = sections.indexOf(section);
        const forIndex = section.answer_key_for;
        if (akIndex >= 0 && forIndex >= 0 && created[akIndex] && created[forIndex]) {
          await supabase
            .from('resources')
            .update({ answer_key_for: created[forIndex].id })
            .eq('id', created[akIndex].id);
        }
      }
    }

    // Hide the parent resource since it's been split
    await supabase
      .from('resources')
      .update({ is_hidden: true })
      .eq('id', resource_id);

    return NextResponse.json({
      mode: 'split',
      created,
      total_sections: created.length,
      junk_removed: created.filter(c => c.type === 'credits' || c.type === 'terms_of_use' || c.type === 'blank' || c.type === 'cover').length,
    });
  } catch (e: any) {
    console.error('Split error:', e);
    return NextResponse.json({ error: e.message || 'Split failed' }, { status: 500 });
  }
}
