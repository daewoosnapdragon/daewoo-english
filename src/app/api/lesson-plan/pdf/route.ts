import { NextResponse } from 'next/server';
import { getEffectiveUser } from '@/lib/effective-user';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { buildStoryProfilePdf, buildUnitPlanPdf } from '@/lib/pdf-builders';

export const maxDuration = 60;

// Simple HTML to plain text (strip tags, decode entities)
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(request: Request) {
  try {
    const { user, userId, supabase } = await getEffectiveUser();
    if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bookNum = parseInt(searchParams.get('book') || '0');
    const moduleNum = parseInt(searchParams.get('module') || '0');

    if (!bookNum || !moduleNum) return NextResponse.json({ error: 'Missing book or module' }, { status: 400 });

    // Fetch all data in parallel
    const [unitPlanRes, notesRes, resourcesRes] = await Promise.all([
      supabase.from('unit_plans').select('*').eq('user_id', userId)
        .eq('book_num', bookNum).eq('module_num', moduleNum)
        .order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('module_notes').select('*').eq('user_id', userId)
        .eq('book_num', bookNum).eq('module_num', moduleNum)
        .order('story_title').order('sort_order'),
      supabase.from('resources').select('id, story_title, resource_type')
        .eq('user_id', userId).eq('book_num', bookNum).eq('module_num', moduleNum),
    ]);

    // Get story profile IDs
    const resourceIds = (resourcesRes.data || []).map((r: any) => r.id);
    const profilesRes = resourceIds.length > 0
      ? await supabase.from('story_profiles').select('*').eq('user_id', userId).in('resource_id', resourceIds)
      : { data: [] };

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const purple = rgb(0.38, 0.15, 0.72);
    const white = rgb(1, 1, 1);
    const gray = rgb(0.45, 0.45, 0.45);
    const lightGray = rgb(0.85, 0.85, 0.85);

    // ====== COVER PAGE ======
    const cover = pdf.addPage([612, 792]);
    cover.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(0.04, 0.02, 0.03) });
    cover.drawRectangle({ x: 0, y: 350, width: 612, height: 120, color: purple });
    cover.drawText('LESSON PLAN', { x: 40, y: 440, size: 10, font, color: rgb(0.8, 0.75, 0.95) });
    cover.drawText(`Book ${bookNum} / Module ${moduleNum}`, { x: 40, y: 410, size: 28, font: bold, color: white });
    cover.drawText('Into Reading', { x: 40, y: 385, size: 14, font: italic, color: rgb(0.85, 0.82, 0.95) });
    cover.drawText(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { x: 40, y: 355, size: 9, font, color: rgb(0.7, 0.65, 0.8) });

    // Table of contents items
    const tocItems: string[] = [];
    if (unitPlanRes.data) tocItems.push('Unit Plan');
    const profiles = profilesRes.data || [];
    for (const p of profiles) {
      const title = p.data?.title || p.title || 'Story Profile';
      tocItems.push(`Story Profile: ${title}`);
    }
    // Group notes by story
    const notes = notesRes.data || [];
    const notesByStory = new Map<string, any[]>();
    for (const n of notes) {
      const key = n.story_title || 'General';
      if (!notesByStory.has(key)) notesByStory.set(key, []);
      notesByStory.get(key)!.push(n);
    }
    for (const [storyTitle] of notesByStory) {
      const displayTitle = storyTitle === '__end_project__' ? 'End of Module Project' : storyTitle;
      tocItems.push(`Journal Notes: ${displayTitle}`);
    }

    // Draw TOC on cover
    let tocY = 310;
    cover.drawText('CONTENTS', { x: 40, y: tocY, size: 8, font: bold, color: rgb(0.6, 0.5, 0.65) });
    tocY -= 18;
    for (let i = 0; i < tocItems.length; i++) {
      cover.drawText(`${i + 1}.`, { x: 40, y: tocY, size: 9, font: bold, color: rgb(0.6, 0.5, 0.65) });
      cover.drawText(tocItems[i], { x: 56, y: tocY, size: 9, font, color: rgb(0.75, 0.7, 0.8) });
      tocY -= 16;
      if (tocY < 60) break;
    }

    cover.drawText('TeacherVault', { x: 40, y: 30, size: 8, font, color: rgb(0.3, 0.25, 0.35) });

    // ====== UNIT PLAN ======
    if (unitPlanRes.data) {
      const unitPdf = await buildUnitPlanPdf(unitPlanRes.data, bookNum, moduleNum);
      const unitPages = await pdf.copyPages(unitPdf, unitPdf.getPageIndices());
      for (const p of unitPages) pdf.addPage(p);
    }

    // ====== STORY PROFILES ======
    for (const profile of profiles) {
      const profilePdf = await PDFDocument.create();
      await buildStoryProfilePdf(profile, profilePdf);
      const profilePages = await pdf.copyPages(profilePdf, profilePdf.getPageIndices());
      for (const p of profilePages) pdf.addPage(p);
    }

    // ====== JOURNAL NOTES ======
    for (const [storyTitle, storyNotes] of notesByStory) {
      const displayTitle = storyTitle === '__end_project__' ? 'End of Module Project' : storyTitle;
      const page = pdf.addPage([612, 792]);
      let y = 760;

      // Story header
      page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: rgb(0.76, 0.63, 0.83) });
      page.drawText('JOURNAL NOTES', { x: 40, y: 766, size: 8, font, color: rgb(0.5, 0.3, 0.6) });
      page.drawText(displayTitle, { x: 40, y: 748, size: 18, font: bold, color: white });
      page.drawText(`Book ${bookNum} / Module ${moduleNum}`, { x: 40, y: 735, size: 9, font: italic, color: rgb(0.85, 0.82, 0.95) });
      y = 718;

      for (const note of storyNotes) {
        if (!note.notes && (!note.resource_ids || note.resource_ids.length === 0)) continue;

        // Section header
        if (y < 80) {
          page.drawLine({ start: { x: 40, y: 30 }, end: { x: 572, y: 30 }, thickness: 0.5, color: lightGray });
          const np = pdf.addPage([612, 792]);
          y = 760;
          // Continue on new page - we need to reference np but we're in a loop
          // Use the last added page
        }

        const currentPage = pdf.getPages()[pdf.getPageCount() - 1];

        // Section name
        currentPage.drawRectangle({ x: 36, y: y - 4, width: 540, height: 16, color: rgb(0.95, 0.93, 0.97) });
        currentPage.drawRectangle({ x: 36, y: y - 4, width: 3, height: 16, color: purple });
        currentPage.drawText((note.folder_name || 'Notes').toUpperCase(), { x: 46, y: y, size: 8, font: bold, color: purple });
        y -= 22;

        // Notes content
        const text = htmlToText(note.notes || '');
        if (text) {
          const lines = text.split('\n');
          for (const line of lines) {
            if (!line.trim()) { y -= 6; continue; }
            // Word wrap
            const words = line.split(' ');
            let currentLine = '';
            for (const word of words) {
              const test = currentLine ? currentLine + ' ' + word : word;
              if (font.widthOfTextAtSize(test, 8.5) > 520 && currentLine) {
                if (y < 50) {
                  currentPage.drawLine({ start: { x: 40, y: 30 }, end: { x: 572, y: 30 }, thickness: 0.5, color: lightGray });
                  pdf.addPage([612, 792]);
                  y = 760;
                }
                const pg = pdf.getPages()[pdf.getPageCount() - 1];
                pg.drawText(currentLine, { x: 44, y, size: 8.5, font, color: rgb(0.2, 0.12, 0.15) });
                y -= 12;
                currentLine = word;
              } else {
                currentLine = test;
              }
            }
            if (currentLine) {
              if (y < 50) {
                pdf.addPage([612, 792]);
                y = 760;
              }
              const pg = pdf.getPages()[pdf.getPageCount() - 1];
              pg.drawText(currentLine, { x: 44, y, size: 8.5, font, color: rgb(0.2, 0.12, 0.15) });
              y -= 12;
            }
          }
        }
        y -= 10;
      }

      // Footer
      const lastPage = pdf.getPages()[pdf.getPageCount() - 1];
      lastPage.drawLine({ start: { x: 40, y: 30 }, end: { x: 572, y: 30 }, thickness: 0.5, color: lightGray });
      lastPage.drawText(`${displayTitle} — TeacherVault`, { x: 40, y: 18, size: 6, font, color: gray });
    }

    const pdfBytes = await pdf.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lesson-plan-b${bookNum}-m${moduleNum}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Lesson plan PDF error:', err);
    return NextResponse.json({ error: `PDF generation failed: ${err.message}` }, { status: 500 });
  }
}
