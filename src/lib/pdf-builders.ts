import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

const C = {
  purple: rgb(0.38, 0.15, 0.72), purpleLight: rgb(0.93, 0.91, 0.98), purpleBg: rgb(0.97, 0.96, 0.99),
  blue: rgb(0.16, 0.39, 0.76), blueLight: rgb(0.9, 0.94, 1.0),
  green: rgb(0.13, 0.55, 0.13), greenLight: rgb(0.9, 0.97, 0.9),
  orange: rgb(0.85, 0.45, 0.18), orangeLight: rgb(1.0, 0.95, 0.9),
  amber: rgb(0.72, 0.53, 0.04), amberLight: rgb(1.0, 0.97, 0.88),
  red: rgb(0.75, 0.15, 0.15), redLight: rgb(1.0, 0.93, 0.93),
  gray: rgb(0.45, 0.45, 0.45), lightGray: rgb(0.85, 0.85, 0.85),
  bgGray: rgb(0.96, 0.96, 0.96), black: rgb(0, 0, 0), white: rgb(1, 1, 1),
};
const LM = 40; const RM = 572; const RW = RM - LM;

function makePdfHelper(pdf: PDFDocument, font: any, bold: any, italic: any, titleText: string) {
  let page = pdf.addPage([612, 792]);
  let y = 760; let pageNum = 1;

  function checkPage(need: number = 20) {
    if (y < need + 40) { drawFooter(); page = pdf.addPage([612, 792]); pageNum++; y = 760; }
  }
  function drawFooter() {
    page.drawLine({ start: { x: LM, y: 30 }, end: { x: RM, y: 30 }, thickness: 0.5, color: C.lightGray });
    page.drawText(`${titleText} — TeacherVault`, { x: LM, y: 18, size: 6, font, color: C.gray });
    page.drawText(`${pageNum}`, { x: RM - 10, y: 18, size: 6, font, color: C.gray });
  }
  function wrap(t: string, f: any, size: number, indent: number = 0, color: any = C.black) {
    const words = (t || '').split(' '); let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (f.widthOfTextAtSize(test, size) > RW - indent && line) { checkPage(size + 4); page.drawText(line, { x: LM + indent, y, size, font: f, color }); y -= size + 3; line = word; }
      else line = test;
    }
    if (line) { checkPage(size + 4); page.drawText(line, { x: LM + indent, y, size, font: f, color }); y -= size + 3; }
  }
  function heading(title: string, ac: any = C.purple, bg: any = C.purpleLight) {
    y -= 8; checkPage(24);
    page.drawRectangle({ x: LM - 4, y: y - 5, width: RW + 8, height: 18, color: bg });
    page.drawRectangle({ x: LM - 4, y: y - 5, width: 3, height: 18, color: ac });
    page.drawText(title.toUpperCase(), { x: LM + 6, y: y - 1, size: 8, font: bold, color: ac });
    y -= 22;
  }
  function tags(items: string[], bg: any = C.bgGray, tc: any = C.black) {
    if (!items?.length) return; let x = LM;
    for (const item of items) {
      const w = font.widthOfTextAtSize(item, 7.5) + 10;
      if (x + w > RM) { x = LM; y -= 14; checkPage(14); }
      page.drawRectangle({ x, y: y - 3, width: w, height: 12, color: bg });
      page.drawText(item, { x: x + 5, y: y, size: 7.5, font, color: tc }); x += w + 4;
    } y -= 16;
  }
  function bullet(t: string, sz: number = 8) { checkPage(sz + 6); page.drawText('●', { x: LM + 4, y: y + 1, size: 4, font, color: C.purple }); wrap(t, font, sz, 14); }
  function label(t: string, color: any = C.purple) { page.drawText(t, { x: LM, y, size: 7, font: bold, color }); y -= 11; }

  return { page: () => page, y: () => y, setY: (v: number) => { y = v; }, checkPage, drawFooter, wrap, heading, tags, bullet, label,
    getPage: () => page, drawOnPage: (fn: (p: PDFPage) => void) => fn(page) };
}

export async function buildStoryProfilePdf(profile: any, pdf: PDFDocument): Promise<PDFDocument> {
  const d = profile.data || {};
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const h = makePdfHelper(pdf, font, bold, italic, d.title || 'Story Profile');
  let page = h.getPage(); let y = 760;
  const sync = () => { y = h.y(); page = h.getPage(); };
  const push = () => { h.setY(y); };

  // Banner
  page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: C.purple });
  page.drawText(d.title || profile.title || 'Story Profile', { x: LM, y: 760, size: 20, font: bold, color: C.white });
  if (d.author) page.drawText(`by ${d.author}`, { x: LM, y: 743, size: 10, font: italic, color: rgb(0.85, 0.82, 0.95) });
  y = 720;
  let bx = LM;
  for (const badge of [d.genre, d.text_structure?.replace(/_/g, ' '), d.authors_purpose].filter(Boolean)) {
    const bw = font.widthOfTextAtSize(badge, 7) + 10;
    page.drawRectangle({ x: bx, y: y - 2, width: bw, height: 12, color: C.purpleLight }); 
    page.drawText(badge, { x: bx + 5, y: y + 1, size: 7, font: bold, color: C.purple }); bx += bw + 4;
  }
  y -= 18; push();

  if (d.summary) { page.drawRectangle({ x: LM - 2, y: y - 40, width: RW + 4, height: 40, color: C.bgGray }); y -= 4; push(); h.wrap(d.summary, font, 8.5, 4, C.gray); sync(); y -= 8; push(); }

  if (d.themes?.length || d.reading_skills?.length) {
    h.heading('Themes & Skills', C.purple, C.purpleLight); sync();
    if (d.themes?.length) { h.label('Themes:'); sync(); h.tags(d.themes, C.purpleLight, C.purple); sync(); }
    if (d.reading_skills?.length) { h.label('Skills:', C.blue); sync(); h.tags(d.reading_skills, C.blueLight, C.blue); sync(); }
    if (d.standards?.length) { h.label('Standards:', C.gray); sync(); h.tags(d.standards, C.bgGray, C.gray); sync(); }
  }

  if (d.vocabulary?.length) {
    h.heading('Vocabulary', C.blue, C.blueLight); sync();
    for (const v of d.vocabulary) {
      h.checkPage(30); sync();
      page.drawText(v.word || '', { x: LM + 4, y, size: 9, font: bold, color: C.blue });
      const ww = bold.widthOfTextAtSize(v.word || '', 9);
      if (v.tier) { const tw = font.widthOfTextAtSize(v.tier, 6) + 8; page.drawRectangle({ x: LM + ww + 10, y: y - 1, width: tw, height: 10, color: C.blueLight }); page.drawText(v.tier, { x: LM + ww + 14, y: y + 1, size: 6, font: bold, color: C.blue }); }
      y -= 12; push();
      if (v.definition) { h.wrap(v.definition, font, 8, 4); sync(); }
      if (v.context_sentence) { h.wrap(`"${v.context_sentence}"`, italic, 7.5, 4, C.gray); sync(); }
      y -= 4; push();
    }
  }

  if (d.mentor_sentences?.length) {
    h.heading('Mentor Sentences', C.green, C.greenLight); sync();
    for (const m of d.mentor_sentences) {
      h.checkPage(30); sync();
      page.drawRectangle({ x: LM, y: y - 16, width: RW, height: 24, color: C.greenLight });
      page.drawRectangle({ x: LM, y: y - 16, width: 3, height: 24, color: C.green });
      h.wrap(`"${m.sentence}"`, italic, 8.5, 10, C.green); sync();
      if (m.skill) { h.wrap(`Skill: ${m.skill}`, font, 7, 10, C.gray); sync(); }
      y -= 6; push();
    }
  }

  if (d.questions?.length) {
    h.heading('Questions', C.orange, C.orangeLight); sync();
    d.questions.forEach((q: any, i: number) => {
      h.checkPage(28); sync();
      page.drawText(`${i + 1}.`, { x: LM, y, size: 8, font: bold, color: C.orange });
      const dl = `DOK ${q.dok || '?'}`; const dw = font.widthOfTextAtSize(dl, 6) + 8;
      page.drawRectangle({ x: LM + 14, y: y - 1, width: dw, height: 10, color: C.orangeLight });
      page.drawText(dl, { x: LM + 18, y: y + 1, size: 6, font: bold, color: C.orange });
      y -= 12; push(); h.wrap(q.question || '', font, 8, 4); sync();
      if (q.choices?.length) { for (let j = 0; j < q.choices.length; j++) { const isA = q.choices[j] === q.answer; h.checkPage(12); sync(); if (isA) page.drawRectangle({ x: LM + 12, y: y - 2, width: font.widthOfTextAtSize(q.choices[j], 7.5) + 18, height: 11, color: C.greenLight }); page.drawText(`${String.fromCharCode(65+j)}. ${q.choices[j]}`, { x: LM + 14, y, size: 7.5, font: isA ? bold : font, color: isA ? C.green : C.black }); y -= 11; push(); } }
      if (q.type === 'short_answer' && q.answer) { h.wrap(`Answer: ${q.answer}`, font, 7.5, 14, C.green); sync(); }
      y -= 4; push();
    });
  }

  if (d.discussion_prompts?.length) { h.heading('Discussion', C.green, C.greenLight); sync(); for (const dp of d.discussion_prompts) { h.bullet(dp.prompt || ''); sync(); if (dp.follow_up) { h.wrap(`→ ${dp.follow_up}`, italic, 7.5, 14, C.gray); sync(); } y -= 2; push(); } }
  if (d.writing_prompts?.length) { h.heading('Writing Prompts', C.orange, C.orangeLight); sync(); for (const w of d.writing_prompts) { if (w.genre) { h.checkPage(16); sync(); const gw = font.widthOfTextAtSize(w.genre, 6) + 8; page.drawRectangle({ x: LM + 4, y: y - 1, width: gw, height: 10, color: C.orangeLight }); page.drawText(w.genre, { x: LM + 8, y: y + 1, size: 6, font: bold, color: C.orange }); y -= 12; push(); } h.wrap(w.prompt || '', font, 8, 4); sync(); y -= 4; push(); } }

  const hasConn = d.grammar_connections?.length || d.phonics_connections?.length || d.writing_connections?.length || d.authors_craft?.length;
  if (hasConn) { h.heading('Connections', C.amber, C.amberLight); sync(); if (d.grammar_connections?.length) { h.label('Grammar:', C.amber); sync(); h.tags(d.grammar_connections, C.amberLight, C.amber); sync(); } if (d.phonics_connections?.length) { h.label('Phonics:', C.amber); sync(); h.tags(d.phonics_connections, C.amberLight, C.amber); sync(); } if (d.writing_connections?.length) { h.label('Writing:', C.amber); sync(); h.tags(d.writing_connections, C.amberLight, C.amber); sync(); } if (d.authors_craft?.length) { h.label("Author's Craft:", C.amber); sync(); h.tags(d.authors_craft, C.amberLight, C.amber); sync(); } }

  const ell = d.korean_ell_connections;
  if (ell && (ell.phonics_alerts?.length || ell.grammar_alerts?.length || ell.cultural_connections?.length)) {
    h.heading('Korean ELL', C.red, C.redLight); sync();
    if (ell.phonics_alerts?.length) { h.label('Phonics Alerts:', C.red); sync(); ell.phonics_alerts.forEach((s: string) => { h.bullet(s, 7.5); sync(); }); }
    if (ell.grammar_alerts?.length) { h.label('Grammar Alerts:', C.red); sync(); ell.grammar_alerts.forEach((s: string) => { h.bullet(s, 7.5); sync(); }); }
    if (ell.cultural_connections?.length) { h.label('Cultural:', C.red); sync(); ell.cultural_connections.forEach((s: string) => { h.bullet(s, 7.5); sync(); }); }
  }

  if (d.differentiation) {
    h.heading('Differentiation', C.purple, C.purpleLight); sync();
    for (const [key, lbl, tc, bc] of [['below_level', 'Below Level', C.blue, C.blueLight], ['above_level', 'Above Level', C.green, C.greenLight], ['ell_supports', 'ELL', C.orange, C.orangeLight]] as any) {
      if (d.differentiation[key]?.length) { h.checkPage(20); sync(); page.drawRectangle({ x: LM, y: y - 4, width: 60, height: 12, color: bc }); page.drawText(lbl, { x: LM + 4, y: y - 1, size: 7, font: bold, color: tc }); y -= 16; push(); d.differentiation[key].forEach((s: string) => { h.bullet(s, 7.5); sync(); }); }
    }
  }

  h.drawFooter();
  return pdf;
}

export async function buildUnitPlanPdf(plan: any, bookNum: number, moduleNum: number): Promise<PDFDocument> {
  const d = plan.data || {};
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const h = makePdfHelper(pdf, font, bold, italic, `Book ${bookNum} Module ${moduleNum}`);
  let page = h.getPage(); let y = 760;
  const sync = () => { y = h.y(); page = h.getPage(); };
  const push = () => { h.setY(y); };

  page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: C.purple });
  page.drawText('UNIT PLAN', { x: LM, y: 766, size: 8, font, color: rgb(0.8, 0.75, 0.95) });
  page.drawText(d.title || `Book ${bookNum} · Module ${moduleNum}`, { x: LM, y: 748, size: 18, font: bold, color: C.white });
  page.drawText(`Into Reading · Book ${bookNum} · Module ${moduleNum}`, { x: LM, y: 735, size: 9, font: italic, color: rgb(0.85, 0.82, 0.95) });
  y = 718; push();

  if (d.module_overview) { page.drawRectangle({ x: LM - 2, y: y - 36, width: RW + 4, height: 36, color: C.bgGray }); y -= 4; push(); h.wrap(d.module_overview, font, 8.5, 4, C.gray); sync(); y -= 8; push(); }
  if (d.essential_questions?.length) { h.heading('Essential Questions', C.purple, C.purpleLight); sync(); for (const q of d.essential_questions) { h.checkPage(16); sync(); h.wrap(`❓ ${q}`, bold, 8.5, 4, C.purple); sync(); y -= 2; push(); } }
  if (d.enduring_understandings?.length) { h.heading('Enduring Understandings', C.blue, C.blueLight); sync(); d.enduring_understandings.forEach((u: string) => { h.bullet(u); sync(); }); }
  if (d.standards?.length) { h.heading('Standards', C.gray, C.bgGray); sync(); h.tags(d.standards, C.bgGray, C.gray); sync(); }

  if (d.stage1_goals) {
    h.heading('Stage 1: Desired Results', C.blue, C.blueLight); sync();
    for (const [key, lbl, tc] of [['knowledge', 'Knowledge:', C.blue], ['skills', 'Skills:', C.green], ['dispositions', 'Dispositions:', C.amber]] as any) {
      if (d.stage1_goals[key]?.length) { h.label(lbl, tc); sync(); d.stage1_goals[key].forEach((k: string) => { h.bullet(k, 7.5); sync(); }); y -= 4; push(); }
    }
  }

  if (d.stage2_assessments) {
    h.heading('Stage 2: Evidence', C.green, C.greenLight); sync();
    const pt = d.stage2_assessments.performance_task;
    if (pt) { h.checkPage(24); sync(); page.drawRectangle({ x: LM, y: y - 20, width: RW, height: 24, color: C.greenLight }); page.drawRectangle({ x: LM, y: y - 20, width: 3, height: 24, color: C.green }); h.wrap(pt.title || 'Performance Task', bold, 8.5, 10); sync(); h.wrap(pt.description || '', font, 7.5, 10, C.gray); sync(); y -= 6; push(); }
    const fa = d.stage2_assessments.formative || d.stage2_assessments.formative_assessments || [];
    if (fa.length) { h.label('Formative:', C.green); sync(); fa.forEach((a: any) => { h.bullet(`${a.title}: ${a.description}`, 7.5); sync(); }); }
  }

  const weeks = d.weekly_plan || d.stage3_learning_plan?.week_overview || [];
  if (weeks.length) {
    h.heading('Weekly Plan', C.orange, C.orangeLight); sync();
    for (const w of weeks) {
      h.checkPage(30); sync();
      page.drawRectangle({ x: LM, y: y - 4, width: RW, height: 16, color: C.orangeLight });
      page.drawText(`Week ${w.week}`, { x: LM + 6, y, size: 9, font: bold, color: C.orange });
      if (w.story || w.focus) page.drawText(w.story || w.focus, { x: LM + 60, y, size: 9, font: italic, color: C.gray });
      y -= 20; push();
      if (w.vocabulary?.length) { page.drawText('Vocab: ' + w.vocabulary.join(', '), { x: LM + 8, y, size: 7, font, color: C.blue }); y -= 10; push(); }
      for (const day of (w.days || w.activities || [])) {
        h.checkPage(16); sync();
        page.drawText(day.day || '', { x: LM + 8, y, size: 7, font: bold, color: C.black });
        h.wrap(day.lesson || day.activity || '', font, 7.5, 50); sync();
        if (day.ell_support) { h.wrap(`ELL: ${day.ell_support}`, italic, 6.5, 50, C.red); sync(); }
      }
      y -= 6; push();
    }
  }

  if (d.differentiation) {
    h.heading('Differentiation', C.purple, C.purpleLight); sync();
    for (const [key, lbl, tc, bc] of [['below', 'Below Level', C.blue, C.blueLight], ['below_level', 'Below Level', C.blue, C.blueLight], ['above', 'Above Level', C.green, C.greenLight], ['above_level', 'Above Level', C.green, C.greenLight], ['korean_ell', 'Korean ELL', C.red, C.redLight]] as any) {
      if (d.differentiation[key]?.length) { h.checkPage(16); sync(); page.drawRectangle({ x: LM, y: y - 4, width: 60, height: 12, color: bc }); page.drawText(lbl, { x: LM + 4, y: y - 1, size: 7, font: bold, color: tc }); y -= 16; push(); d.differentiation[key].forEach((s: string) => { h.bullet(s, 7.5); sync(); }); }
    }
  }

  for (const [lbl, items, tc, bc] of [['Grammar', d.grammar_focus, C.amber, C.amberLight], ['Phonics', d.phonics_focus, C.blue, C.blueLight], ['Writing', d.writing_focus, C.green, C.greenLight]] as any) {
    if (items?.length) { h.label(`${lbl}:`, tc); sync(); h.tags(items, bc, tc); sync(); }
  }

  h.drawFooter();
  return pdf;
}
