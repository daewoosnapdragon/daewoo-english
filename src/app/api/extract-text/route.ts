import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

// Extract text from a PDF stored in Supabase Storage
// Uses pdf-parse on the server side
export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource_id } = await request.json();
  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resource_id)
    .eq('user_id', user.id)
    .single();

  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (resource.file_type !== 'pdf') {
    // For non-PDF, return filename-based text
    return NextResponse.json({
      full_text: `Resource: ${resource.title}. File: ${resource.original_filename}. Type: ${resource.file_type}.`,
      page_texts: [],
      page_count: resource.page_count || 1,
    });
  }

  // Download PDF from Supabase storage
  const { data: fileData, error: dlError } = await supabase.storage
    .from('resources')
    .download(resource.storage_path);

  if (dlError || !fileData) {
    return NextResponse.json({ error: 'Could not download file' }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Dynamic import pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    
    // Extract full text
    const parsed = await pdfParse(buffer, {
      max: 0, // all pages
    });

    const fullText = parsed.text || '';
    const pageCount = parsed.numpages || 1;

    // Try to split by page using form feed or heuristics
    // pdf-parse doesn't give per-page text easily, so we use a workaround
    const pageTexts: string[] = [];
    
    // Extract per-page text by parsing each page range
    for (let i = 0; i < pageCount; i++) {
      try {
        const pageResult = await pdfParse(buffer, {
          max: 1,
          pagerender: undefined,
          // Use page range
        });
        // This is imperfect - pdf-parse doesn't support per-page well
        // We'll split the full text heuristically
      } catch {
        // ignore
      }
    }

    // Heuristic page splitting: split on large gaps or form feeds
    const roughPages = fullText.split(/\f/);
    if (roughPages.length >= pageCount * 0.5) {
      // Form feed splitting worked reasonably
      for (let i = 0; i < pageCount; i++) {
        pageTexts.push(roughPages[i] || '');
      }
    } else {
      // Fall back: divide text roughly equally
      const chunkSize = Math.ceil(fullText.length / pageCount);
      for (let i = 0; i < pageCount; i++) {
        pageTexts.push(fullText.slice(i * chunkSize, (i + 1) * chunkSize));
      }
    }

    // Update resource page count if we got a better number
    if (pageCount !== resource.page_count) {
      await supabase
        .from('resources')
        .update({ page_count: pageCount })
        .eq('id', resource_id);
    }

    return NextResponse.json({
      full_text: fullText.slice(0, 15000), // cap for API responses
      page_texts: pageTexts.map(t => t.slice(0, 1000)), // cap per page
      page_count: pageCount,
    });
  } catch (e: any) {
    console.error('PDF parse error:', e);
    return NextResponse.json({ error: e.message || 'Failed to parse PDF' }, { status: 500 });
  }
}
