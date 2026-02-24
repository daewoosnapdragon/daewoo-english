import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { buildStoryProfilePdf, buildUnitPlanPdf } from '@/lib/pdf-builders';

export const maxDuration = 60;

export async function GET(request: Request) {
  const { user, userId, supabase } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookNum = parseInt(searchParams.get('book') || '0');
  const moduleNum = parseInt(searchParams.get('module') || '0');

  if (!bookNum || !moduleNum) {
    return NextResponse.json({ error: 'book and module params required' }, { status: 400 });
  }

  // Get all resources in this module
  const { data: resources } = await supabase
    .from('resources')
    .select('id, title, story_title, resource_type, storage_path, file_type')
    .eq('user_id', userId)
    .eq('curriculum', 'Into Reading')
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .eq('is_hidden', false)
    .order('sort_order')
    .order('title');

  if (!resources?.length) {
    return NextResponse.json({ error: 'No resources found for this module' }, { status: 404 });
  }

  const resourceIds = resources.map(r => r.id);

  // Get unit plan
  const { data: unitPlan } = await supabase
    .from('unit_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('book_num', bookNum)
    .eq('module_num', moduleNum)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get all story profiles for this module
  const { data: profiles } = await supabase
    .from('story_profiles')
    .select('*')
    .eq('user_id', userId)
    .in('resource_id', resourceIds)
    .order('created_at', { ascending: false });

  // Dedupe profiles by resource_id (take latest)
  const profileMap = new Map<string, any>();
  for (const p of (profiles || [])) {
    if (!profileMap.has(p.resource_id)) profileMap.set(p.resource_id, p);
  }
  const uniqueProfiles = Array.from(profileMap.values());

  // Build the merged PDF
  const mergedPdf = await PDFDocument.create();
  const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const bold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
  const accent = rgb(0.29, 0.27, 0.53);

  // --- Cover page ---
  const cover = mergedPdf.addPage([612, 792]);
  cover.drawText('Into Reading', { x: 40, y: 600, size: 14, font, color: rgb(0.5, 0.5, 0.5) });
  cover.drawText(`Book ${bookNum}, Module ${moduleNum}`, { x: 40, y: 560, size: 32, font: bold, color: accent });
  if (unitPlan?.data?.title) {
    cover.drawText(unitPlan.data.title, { x: 40, y: 520, size: 18, font: bold, color: rgb(0.3, 0.3, 0.3) });
  }

  let yList = 470;
  cover.drawText('Contents:', { x: 40, y: yList, size: 12, font: bold, color: accent });
  yList -= 24;

  if (unitPlan) {
    cover.drawText('• Unit Plan (generated)', { x: 50, y: yList, size: 10, font, color: rgb(0, 0, 0) });
    yList -= 16;
  }

  // List resource files
  for (const r of resources) {
    const label = r.story_title
      ? `• ${r.title} (${r.resource_type} — ${r.story_title})`
      : `• ${r.title} (${r.resource_type})`;
    const truncated = label.length > 80 ? label.slice(0, 77) + '...' : label;
    if (yList > 60) {
      cover.drawText(truncated, { x: 50, y: yList, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
      yList -= 14;
    }
  }

  for (const p of uniqueProfiles) {
    const title = p.data?.title || p.title || 'Untitled';
    if (yList > 60) {
      cover.drawText(`• Story Profile: ${title} (generated)`, { x: 50, y: yList, size: 9, font, color: rgb(0.4, 0.2, 0.6) });
      yList -= 14;
    }
  }

  cover.drawText(`Generated ${new Date().toLocaleDateString()} · TeacherVault`, {
    x: 40, y: 30, size: 8, font, color: rgb(0.6, 0.6, 0.6),
  });

  // --- Unit Plan PDF ---
  if (unitPlan) {
    try {
      const upPdf = await buildUnitPlanPdf(unitPlan, bookNum, moduleNum);
      const upPages = await mergedPdf.copyPages(upPdf, upPdf.getPageIndices());
      for (const p of upPages) mergedPdf.addPage(p);
    } catch (e) {
      console.error('Error building unit plan PDF:', e);
    }
  }

  // --- Actual resource files (PDFs and images) ---
  for (const r of resources) {
    try {
      // Add a separator/title page for each resource
      const sepPage = mergedPdf.addPage([612, 792]);
      sepPage.drawText(r.title, { x: 40, y: 450, size: 20, font: bold, color: accent });
      sepPage.drawText(r.resource_type + (r.story_title ? ` — ${r.story_title}` : ''), {
        x: 40, y: 420, size: 12, font, color: rgb(0.5, 0.5, 0.5),
      });

      // Download the file from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('resources')
        .download(r.storage_path);

      if (dlError || !fileData) {
        sepPage.drawText('(File could not be loaded)', { x: 40, y: 380, size: 10, font, color: rgb(0.8, 0.3, 0.3) });
        continue;
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      if (r.file_type === 'pdf') {
        // Merge PDF pages
        try {
          const srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const indices = srcPdf.getPageIndices();
          if (indices.length > 0) {
            const copiedPages = await mergedPdf.copyPages(srcPdf, indices);
            for (const cp of copiedPages) mergedPdf.addPage(cp);
            // Remove the separator page since we have actual content
            // Actually keep it — it helps organize the bundle
          }
        } catch (pdfErr) {
          console.error(`Error embedding PDF ${r.title}:`, pdfErr);
          sepPage.drawText('(PDF could not be embedded — may be encrypted)', {
            x: 40, y: 380, size: 10, font, color: rgb(0.8, 0.3, 0.3),
          });
        }
      } else if (['png', 'jpg', 'jpeg', 'image'].includes(r.file_type || '')) {
        // Embed image on the separator page
        try {
          let img;
          if (r.file_type === 'png') {
            img = await mergedPdf.embedPng(buffer);
          } else {
            img = await mergedPdf.embedJpg(buffer);
          }
          const maxW = 532; // 612 - 80 margin
          const maxH = 360;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;
          sepPage.drawImage(img, { x: 40, y: 380 - h, width: w, height: h });
        } catch (imgErr) {
          console.error(`Error embedding image ${r.title}:`, imgErr);
          sepPage.drawText('(Image could not be embedded)', {
            x: 40, y: 380, size: 10, font, color: rgb(0.8, 0.3, 0.3),
          });
        }
      } else {
        sepPage.drawText(`(${r.file_type?.toUpperCase() || 'Unknown'} file — not embeddable in PDF)`, {
          x: 40, y: 380, size: 10, font, color: rgb(0.6, 0.6, 0.6),
        });
      }
    } catch (e) {
      console.error(`Error processing resource ${r.title}:`, e);
    }
  }

  // --- Story Profile PDFs ---
  for (const profile of uniqueProfiles) {
    try {
      const spPdf = await PDFDocument.create();
      await buildStoryProfilePdf(profile, spPdf);
      const spPages = await mergedPdf.copyPages(spPdf, spPdf.getPageIndices());
      for (const p of spPages) mergedPdf.addPage(p);
    } catch (e) {
      console.error('Error building story profile PDF:', e);
    }
  }

  const pdfBytes = await mergedPdf.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="book${bookNum}-module${moduleNum}-bundle.pdf"`,
    },
  });
}
