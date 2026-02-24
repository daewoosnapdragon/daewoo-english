import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

export async function buildStoryProfilePdf(profile: any, pdf: PDFDocument): Promise<PDFDocument> {
  const d = profile.data || {};
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = rgb(0.29, 0.27, 0.53);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);
  const LM = 40;
  const RW = 532;

  let page = pdf.addPage([612, 792]);
  let y = 755;

  function checkPage(need: number = 20) {
    if (y < need + 30) {
      page.drawText(`TeacherVault · ${d.title || ''}`, { x: LM, y: 15, size: 6, font, color: rgb(0.7, 0.7, 0.7) });
      page = pdf.addPage([612, 792]);
      y = 755;
    }
  }

  function text(t: string, opts: { size?: number; color?: any; isBold?: boolean; indent?: number } = {}) {
    const { size = 9, color = black, isBold = false, indent = 0 } = opts;
    const f = isBold ? bold : font;
    const maxW = RW - indent;
    const words = (t || '').split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        checkPage(size + 4);
        page.drawText(line, { x: LM + indent, y, size, font: f, color });
        y -= size + 3;
        line = word;
      } else line = test;
    }
    if (line) { checkPage(size + 4); page.drawText(line, { x: LM + indent, y, size, font: f, color }); y -= size + 3; }
  }

  function heading(t: string) {
    y -= 6;
    checkPage(20);
    page.drawRectangle({ x: LM - 2, y: y - 3, width: RW + 4, height: 15, color: rgb(0.95, 0.94, 0.98) });
    page.drawText(t, { x: LM, y, size: 10, font: bold, color: accent });
    y -= 18;
  }

  function bullet(t: string, opts: { size?: number; color?: any } = {}) {
    text('• ' + t, { indent: 8, ...opts });
  }

  // Title
  page.drawText(d.title || profile.title || 'Story Profile', { x: LM, y, size: 18, font: bold, color: accent });
  y -= 20;
  if (d.author) text(`by ${d.author}`, { size: 10, color: gray });
  const meta = [d.genre, d.text_structure?.replace(/_/g, ' '), d.authors_purpose].filter(Boolean).join(' · ');
  if (meta) text(meta, { size: 8, color: gray });
  y -= 4;

  if (d.summary) { heading('Summary'); text(d.summary, { size: 8 }); }

  if (d.themes?.length || d.reading_skills?.length) {
    heading('Themes & Skills');
    if (d.themes?.length) text('Themes: ' + d.themes.join(', '), { size: 8 });
    if (d.reading_skills?.length) text('Skills: ' + d.reading_skills.join(', '), { size: 8 });
    if (d.standards?.length) text('Standards: ' + d.standards.join(', '), { size: 7, color: gray });
  }

  if (d.vocabulary?.length) {
    heading('Vocabulary');
    for (const v of d.vocabulary) {
      bullet(`${v.word} (${v.tier || ''}, ${v.part_of_speech || ''}) — ${v.definition || ''}`, { size: 8 });
      if (v.context_sentence) text(`"${v.context_sentence}"`, { size: 7, color: gray, indent: 16 });
    }
  }

  if (d.mentor_sentences?.length) {
    heading('Mentor Sentences');
    for (const m of d.mentor_sentences) {
      text(`"${m.sentence}"`, { size: 8, isBold: true });
      text(`Skill: ${m.skill || ''}${m.mini_lesson ? ' — ' + m.mini_lesson : ''}`, { size: 7, color: gray, indent: 8 });
      y -= 2;
    }
  }

  if (d.questions?.length) {
    heading('Questions');
    for (const q of d.questions) {
      bullet(`[DOK ${q.dok || '?'}] ${q.question || ''}`, { size: 8 });
      if (q.answer) text(`Answer: ${q.answer}`, { size: 7, color: gray, indent: 16 });
    }
  }

  if (d.discussion_prompts?.length) {
    heading('Discussion Prompts');
    for (const p of d.discussion_prompts) {
      bullet(p.prompt || '', { size: 8 });
      if (p.follow_up) text(`Follow-up: ${p.follow_up}`, { size: 7, color: gray, indent: 16 });
    }
  }

  if (d.writing_prompts?.length) {
    heading('Writing Prompts');
    for (const w of d.writing_prompts) {
      bullet(`[${w.genre || ''}] ${w.prompt || ''}`, { size: 8 });
    }
  }

  const connections = [];
  if (d.grammar_connections?.length) connections.push('Grammar: ' + d.grammar_connections.join(', '));
  if (d.phonics_connections?.length) connections.push('Phonics: ' + d.phonics_connections.join(', '));
  if (d.writing_connections?.length) connections.push('Writing: ' + d.writing_connections.join(', '));
  if (d.authors_craft?.length) connections.push("Author's Craft: " + d.authors_craft.join(', '));
  if (d.text_features?.length) connections.push('Text Features: ' + d.text_features.join(', '));
  if (connections.length) { heading('Connections'); for (const c of connections) text(c, { size: 8 }); }

  if (d.korean_ell_connections) {
    const ell = d.korean_ell_connections;
    const hasItems = (ell.phonics_alerts?.length || ell.grammar_alerts?.length || ell.cultural_connections?.length);
    if (hasItems) {
      heading('Korean ELL Supports');
      if (ell.phonics_alerts?.length) { text('Phonics Alerts:', { size: 7, isBold: true }); ell.phonics_alerts.forEach((s: string) => bullet(s, { size: 7 })); }
      if (ell.grammar_alerts?.length) { text('Grammar Alerts:', { size: 7, isBold: true }); ell.grammar_alerts.forEach((s: string) => bullet(s, { size: 7 })); }
      if (ell.cultural_connections?.length) { text('Cultural:', { size: 7, isBold: true }); ell.cultural_connections.forEach((s: string) => bullet(s, { size: 7 })); }
    }
  }

  if (d.word_work) {
    const ww = d.word_work;
    if (ww.high_frequency?.length || ww.spelling_patterns?.length || ww.morphology?.length) {
      heading('Word Work');
      if (ww.high_frequency?.length) text('High-Frequency: ' + ww.high_frequency.join(', '), { size: 8 });
      if (ww.spelling_patterns?.length) text('Spelling: ' + ww.spelling_patterns.join(', '), { size: 8 });
      if (ww.morphology?.length) {
        for (const m of ww.morphology) bullet(`${m.word}: ${m.prefix || ''}+${m.root || ''} = ${m.meaning || ''}`, { size: 8 });
      }
    }
  }

  if (d.differentiation) {
    heading('Differentiation');
    if (d.differentiation.below_level?.length) { text('Below Level:', { size: 8, isBold: true }); d.differentiation.below_level.forEach((s: string) => bullet(s, { size: 7 })); }
    if (d.differentiation.above_level?.length) { text('Above Level:', { size: 8, isBold: true }); d.differentiation.above_level.forEach((s: string) => bullet(s, { size: 7 })); }
    if (d.differentiation.ell_supports?.length) { text('ELL:', { size: 8, isBold: true }); d.differentiation.ell_supports.forEach((s: string) => bullet(s, { size: 7 })); }
  }

  page.drawText(`TeacherVault Story Profile · ${new Date().toLocaleDateString()}`, { x: LM, y: 15, size: 6, font, color: rgb(0.7, 0.7, 0.7) });

  return pdf;
}

export async function buildUnitPlanPdf(plan: any, bookNum: number, moduleNum: number): Promise<PDFDocument> {
  const d = plan.data || {};
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = rgb(0.29, 0.27, 0.53);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);
  const LM = 40;
  const RW = 532;

  let page = pdf.addPage([612, 792]);
  let y = 755;

  function checkPage(need: number = 20) {
    if (y < need + 30) { page = pdf.addPage([612, 792]); y = 755; }
  }

  function text(t: string, opts: { size?: number; color?: any; isBold?: boolean; indent?: number } = {}) {
    const { size = 9, color = black, isBold = false, indent = 0 } = opts;
    const f = isBold ? bold : font;
    const maxW = RW - indent;
    const words = (t || '').split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        checkPage(size + 4); page.drawText(line, { x: LM + indent, y, size, font: f, color }); y -= size + 3; line = word;
      } else line = test;
    }
    if (line) { checkPage(size + 4); page.drawText(line, { x: LM + indent, y, size, font: f, color }); y -= size + 3; }
  }

  function heading(t: string) {
    y -= 6; checkPage(20);
    page.drawRectangle({ x: LM - 2, y: y - 3, width: RW + 4, height: 15, color: rgb(0.95, 0.94, 0.98) });
    page.drawText(t, { x: LM, y, size: 10, font: bold, color: accent });
    y -= 18;
  }

  function bullet(t: string) { text('• ' + t, { indent: 8 }); }

  page.drawText('UNIT PLAN', { x: LM, y, size: 8, font: bold, color: gray });
  y -= 14;
  page.drawText(d.title || plan.title || `Module ${moduleNum}`, { x: LM, y, size: 18, font: bold, color: accent });
  y -= 20;
  text(`Book ${bookNum}, Module ${moduleNum}`, { size: 10, color: gray });
  y -= 4;

  if (d.module_overview) { text(d.module_overview); y -= 2; }
  if (d.essential_questions?.length) { heading('Essential Questions'); d.essential_questions.forEach((q: string) => bullet(q)); }
  if (d.enduring_understandings?.length) { heading('Enduring Understandings'); d.enduring_understandings.forEach((u: string) => bullet(u)); }
  if (d.standards?.length) { heading('Standards'); text(d.standards.join(', '), { size: 8, color: gray }); }

  if (d.stage1_goals) {
    heading('Stage 1: Goals');
    if (d.stage1_goals.knowledge?.length) { text('Knowledge:', { isBold: true, size: 8 }); d.stage1_goals.knowledge.forEach((k: string) => bullet(k)); }
    if (d.stage1_goals.skills?.length) { text('Skills:', { isBold: true, size: 8 }); d.stage1_goals.skills.forEach((s: string) => bullet(s)); }
    if (d.stage1_goals.dispositions?.length) { text('Dispositions:', { isBold: true, size: 8 }); d.stage1_goals.dispositions.forEach((dd: string) => bullet(dd)); }
  }

  if (d.stage2_assessments) {
    heading('Stage 2: Evidence');
    const pt = d.stage2_assessments.performance_task;
    if (pt) { text(pt.title || 'Performance Task', { isBold: true }); text(pt.description || '', { size: 8 }); }
    const fa = d.stage2_assessments.formative || d.stage2_assessments.formative_assessments || [];
    if (fa.length) { text('Formative:', { isBold: true, size: 8 }); fa.forEach((a: any) => bullet(`${a.title}: ${a.description}`)); }
  }

  const weeks = d.weekly_plan || d.stage3_learning_plan?.week_overview || [];
  if (weeks.length) {
    heading('Weekly Plan');
    weeks.forEach((w: any) => {
      text(`Week ${w.week}: ${w.story || w.focus || ''}`, { isBold: true });
      if (w.vocabulary?.length) text(`Vocab: ${w.vocabulary.join(', ')}`, { size: 8, color: gray });
      (w.days || w.activities || []).forEach((day: any) => {
        text(`${day.day}: ${day.lesson || day.activity || ''}`, { size: 8, indent: 8 });
        if (day.ell_support) text(`ELL: ${day.ell_support}`, { size: 7, color: gray, indent: 16 });
      });
      y -= 4;
    });
  }

  if (d.differentiation) {
    heading('Differentiation');
    const diff = d.differentiation;
    if (diff.below?.length || diff.below_level?.length) { text('Below:', { isBold: true, size: 8 }); (diff.below || diff.below_level || []).forEach((s: string) => bullet(s)); }
    if (diff.above?.length || diff.above_level?.length) { text('Above:', { isBold: true, size: 8 }); (diff.above || diff.above_level || []).forEach((s: string) => bullet(s)); }
    if (diff.korean_ell?.length) { text('Korean ELL:', { isBold: true, size: 8 }); diff.korean_ell.forEach((s: string) => bullet(s)); }
  }

  if (d.grammar_focus?.length) { heading('Grammar'); text(d.grammar_focus.join(', '), { size: 8 }); }
  if (d.phonics_focus?.length) { heading('Phonics'); text(d.phonics_focus.join(', '), { size: 8 }); }
  if (d.writing_focus?.length) { heading('Writing'); text(d.writing_focus.join(', '), { size: 8 }); }

  page.drawText(`TeacherVault Unit Plan · ${new Date().toLocaleDateString()}`, { x: LM, y: 15, size: 6, font, color: rgb(0.7, 0.7, 0.7) });

  return pdf;
}
