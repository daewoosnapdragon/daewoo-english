// ═══════════════════════════════════════════════════════════════
// SEMESTER PLAN PARSER
// Parses a markdown-converted lesson plan into SemesterPlanData
//
// Input: Markdown text (from pandoc conversion of .docx)
// Output: SemesterPlanData JSON
//
// The parser recognizes these document sections by heading patterns:
//   # **Spring Semester** / # **Fall Semester**
//   # **Weekly Structure Overview**
//   # **Integration Map...**
//   # **Planning Notes...**
//   # **Phonics**
//   # **Phonemic Awareness Scope & Sequence**
//   # **Grammar Scope & Sequence**
//   # **INTO READING UNIT OVERVIEW**
//   # **STORY N: TITLE**
//   # **MODULE WRAP-UP: TITLE**
//   # **Weekly Breakdown: Skeleton View**
// ═══════════════════════════════════════════════════════════════

import {
  SemesterPlanData, StoryPlan, StoryLesson, ProcedureStep,
  IntegrationRow, PhonicsPhase, PhonicsWeek, PAWeek, GrammarWeek,
  SkeletonWeek, SkeletonDay, UnitOverview, planId
} from '@/types/semester-plan';

// ── Main entry point ──
export function parseSemesterPlan(markdown: string): SemesterPlanData {
  const sections = splitTopSections(markdown);

  return {
    version: 1,
    weekly_structure: parseWeeklyStructure(sections['weekly_structure'] || ''),
    integration_map: parseIntegrationMap(sections['integration_map'] || ''),
    planning_notes: parsePlanningNotes(sections['planning_notes'] || ''),
    unit_overview: parseUnitOverview(sections['unit_overview'] || ''),
    stories: parseAllStories(sections['stories'] || []),
    phonics_scope: parsePhonicsScope(sections['phonics'] || ''),
    pa_scope: parsePAScope(sections['pa_scope'] || ''),
    grammar_scope: parseGrammarScope(sections['grammar_scope'] || ''),
    weekly_skeleton: parseWeeklySkeleton(sections['weekly_skeleton'] || ''),
    custom_notes: {},
    custom_flags: {},
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION SPLITTER
// Splits the full markdown into named sections by H1 patterns
// ═══════════════════════════════════════════════════════════════

function splitTopSections(md: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = md.split('\n');

  let currentKey = '';
  let currentLines: string[] = [];
  const storyBlocks: string[] = [];

  function flush() {
    if (!currentKey) return;
    if (currentKey === 'story') {
      storyBlocks.push(currentLines.join('\n'));
    } else {
      result[currentKey] = currentLines.join('\n');
    }
    currentLines = [];
  }

  for (const line of lines) {
    const h1 = line.match(/^#\s+\*\*(.+?)\*\*/);
    if (h1) {
      flush();
      const title = h1[1].toLowerCase().trim();

      if (title.includes('weekly structure')) currentKey = 'weekly_structure';
      else if (title.includes('integration map')) currentKey = 'integration_map';
      else if (title.includes('planning notes') || title.includes('flex tips')) currentKey = 'planning_notes';
      else if (title.includes('phonemic awareness')) currentKey = 'pa_scope';
      else if (title === 'phonics') currentKey = 'phonics';
      else if (title.includes('grammar scope')) currentKey = 'grammar_scope';
      else if (title.includes('into reading unit overview')) currentKey = 'unit_overview';
      else if (title.includes('weekly breakdown') || title.includes('skeleton')) currentKey = 'weekly_skeleton';
      else if (title.match(/story \d/i) || title.includes('module wrap-up')) currentKey = 'story';
      else if (title.includes('semester')) currentKey = 'metadata';
      else currentKey = '';

      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  result['stories'] = storyBlocks;
  return result;
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY STRUCTURE PARSER
// ═══════════════════════════════════════════════════════════════

function parseWeeklyStructure(text: string): SemesterPlanData['weekly_structure'] {
  const rhythm = extractBetween(text, 'Weekly Rhythm', 'Design Logic') || extractTableContent(text);
  const logic = extractAfterLabel(text, 'Design Logic');
  const flex = extractAfterLabel(text, 'Flex Note');

  return {
    rhythm: rhythm || 'Day 1: PA, Day 2: IR, Day 3: SoR, Day 4: IR, Day 5: Grammar (2-2-1 ratio)',
    design_logic: logic || 'PA on Day 1 primes the ear for the SoR print work on Day 3. The two IR days are spaced to allow processing time. Grammar on Day 5 gives a structured close to the week.',
    flex_note: flex || 'Days are interchangeable. What matters is the 2-2-1 ratio each week, not the specific day.',
  };
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION MAP PARSER
// Parses the table with Unit Section / Phonics / Grammar / Connection
// ═══════════════════════════════════════════════════════════════

function parseIntegrationMap(text: string): IntegrationRow[] {
  const rows: IntegrationRow[] = [];
  // Look for table rows with bold section names
  const tableRows = text.split(/\n\s*\n/).filter(chunk =>
    chunk.includes('**') && (chunk.includes('Wks') || chunk.includes('Wk'))
  );

  // Parse the markdown table format
  const lines = text.split('\n');
  let currentRow: Partial<IntegrationRow> = {};
  let order = 0;

  for (const line of lines) {
    // Detect bold section headers in table cells
    const sectionMatch = line.match(/\*\*(.+?)\s*\(Wks?\s*[\d-]+\)\*\*/);
    if (sectionMatch) {
      if (currentRow.unit_section) {
        rows.push({
          id: planId(),
          unit_section: currentRow.unit_section || '',
          phonics_tie: currentRow.phonics_tie || '',
          grammar_tie: currentRow.grammar_tie || '',
          connection: currentRow.connection || '',
          sort_order: order++,
        });
      }
      currentRow = { unit_section: sectionMatch[1].trim() + ` (${line.match(/Wks?\s*[\d-]+/)?.[0] || ''})` };
    }
  }

  // Flush last row
  if (currentRow.unit_section) {
    rows.push({
      id: planId(),
      unit_section: currentRow.unit_section || '',
      phonics_tie: currentRow.phonics_tie || '',
      grammar_tie: currentRow.grammar_tie || '',
      connection: currentRow.connection || '',
      sort_order: order,
    });
  }

  // If table parsing didn't work well, try a simpler approach
  if (rows.length === 0) {
    const sections = text.split(/\*\*(?=\S)/);
    for (let i = 1; i < sections.length; i++) {
      const chunk = sections[i];
      const nameMatch = chunk.match(/^(.+?)\*\*/);
      if (nameMatch && (chunk.includes('Wk') || chunk.includes('CVC') || chunk.includes('Digraph') || chunk.includes('blend'))) {
        rows.push({
          id: planId(),
          unit_section: nameMatch[1].trim(),
          phonics_tie: '',
          grammar_tie: '',
          connection: cleanText(chunk.replace(nameMatch[0], '').slice(0, 300)),
          sort_order: rows.length,
        });
      }
    }
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════
// PLANNING NOTES PARSER
// ═══════════════════════════════════════════════════════════════

function parsePlanningNotes(text: string): string[] {
  const notes: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  for (const p of paragraphs) {
    const cleaned = cleanText(p);
    if (cleaned.length > 20 && !cleaned.startsWith('#') && !cleaned.startsWith('+') && !cleaned.startsWith('|')) {
      // Extract the bold label + content pattern
      const boldMatch = cleaned.match(/\*\*(.+?)\*\*\s*(.*)/s);
      if (boldMatch) {
        notes.push(`${boldMatch[1].trim()} ${boldMatch[2].trim()}`);
      } else {
        notes.push(cleaned);
      }
    }
  }

  return notes;
}

// ═══════════════════════════════════════════════════════════════
// STORY PLAN PARSER
// The core parser — handles per-story class-by-class lesson plans
// ═══════════════════════════════════════════════════════════════

function parseAllStories(storyBlocks: string[]): StoryPlan[] {
  return storyBlocks.map((block, i) => parseStoryBlock(block, i));
}

function parseStoryBlock(text: string, index: number): StoryPlan {
  const lines = text.split('\n');

  // Extract story title from H1
  const titleMatch = lines[0]?.match(/STORY\s+(\d+):\s*(.+?)(?:\*|$)/i)
    || lines[0]?.match(/MODULE WRAP-UP:\s*(.+?)(?:\*|$)/i);

  let storyTitle = 'Untitled';
  let storyNum = index + 1;
  let label = `STORY ${index + 1}`;

  if (titleMatch) {
    if (titleMatch[2]) {
      storyNum = parseInt(titleMatch[1]) || index + 1;
      storyTitle = cleanText(titleMatch[2]);
      label = `STORY ${storyNum}`;
    } else {
      storyTitle = cleanText(titleMatch[1]);
      label = 'MODULE WRAP-UP';
    }
  }

  // Extract metadata from the header section (before first CLASS)
  const headerEnd = text.search(/\*\*CLASS\s+\d/);
  const header = headerEnd > 0 ? text.slice(0, headerEnd) : text.slice(0, 500);

  const typeMatch = header.match(/(?:Short Read|Guided Practice|Performance Task)[^*]*/i);
  const genreMatch = header.match(/\*\*Genre:\*\*\s*(.+?)(?:\.|$)/m) || header.match(/Genre:\*?\*?\s*(.+?)(?:\.|Pages|$)/im);
  const pagesMatch = header.match(/Pages?\s+[\d-]+\s+of\s+myBook/i);
  const powerMatch = header.match(/\*\*Power Words?:\*\*\s*(.+?)$/m) || header.match(/Power Words?:\*?\*?\s*(.+?)$/im);
  const domainMatch = header.match(/\*\*Domain Vocabulary:\*\*\s*(.+?)$/m);

  const genre = genreMatch ? cleanText(genreMatch[1]) : '';
  const type = typeMatch ? cleanText(typeMatch[0]) : '';
  const pages = pagesMatch ? pagesMatch[0] : '';
  const powerWords = powerMatch
    ? powerMatch[1].split(/,\s*/).map(w => cleanText(w)).filter(Boolean)
    : [];
  const domainVocab = domainMatch
    ? domainMatch[1].split(/,\s*/).map(w => cleanText(w)).filter(Boolean)
    : [];

  // Parse individual class/lesson blocks
  const classBlocks = splitClassBlocks(text);
  const lessons = classBlocks.map((block, i) => parseClassBlock(block, i));

  return {
    id: planId(),
    title: storyTitle,
    story_num: storyNum,
    label,
    type,
    genre,
    total_classes: lessons.length,
    pages,
    power_words: powerWords,
    domain_vocabulary: domainVocab.length > 0 ? domainVocab : undefined,
    lessons,
    sort_order: index,
  };
}

function splitClassBlocks(text: string): string[] {
  const blocks: string[] = [];
  const pattern = /\*\*CLASS\s+\d+/g;
  const matches = [...text.matchAll(pattern)];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    blocks.push(text.slice(start, end));
  }

  return blocks;
}

function parseClassBlock(text: string, index: number): StoryLesson {
  const lines = text.split('\n');

  // Class number and title
  const classMatch = text.match(/\*\*CLASS\s+(\d+)(?:\s*\([^)]*\))?\s*:\s*(.+?)\*\*/i);
  const classNum = classMatch ? parseInt(classMatch[1]) : index + 1;
  const classTitle = classMatch ? cleanText(classMatch[2]) : `Class ${index + 1}`;

  // SWBAT
  const swbatMatch = text.match(/\*?\*?SWBAT:\*?\*?\s*(.+?)(?=\n\n|\n\*\*Materials|\*\*Materials)/s);
  const swbat = swbatMatch ? cleanText(swbatMatch[1]) : '';

  // Standards - extract from the SWBAT line or nearby
  const standards = extractStandards(text);

  // Materials
  const materialsMatch = text.match(/\*\*Materials:\*\*\s*(.+?)(?=\n\n|\n\*\*Procedure)/s);
  const materials = materialsMatch ? cleanText(materialsMatch[1]) : '';

  // Procedure - parse timed steps
  const procedure = parseProcedure(text);

  // Assessment
  const assessMatch = text.match(/\*\*Assessment:\*\*\s*(.+?)(?=\n\n|\n\*\*ELL)/s);
  const assessment = assessMatch ? cleanText(assessMatch[1]) : '';
  const assessType = assessment.toLowerCase().includes('summative') ? 'summative' as const
    : assessment.toLowerCase().includes('formative') ? 'formative' as const
    : undefined;

  // ELL Supports
  const ellMatch = text.match(/\*\*ELL Supports?:\*\*\s*(.+?)(?=\n\n|\n\*\*Extension|\n\*\*CLASS|\n#|$)/s);
  const ell = ellMatch ? cleanText(ellMatch[1]) : '';

  // Extension/Homework
  const extMatch = text.match(/\*\*Extension(?:\/Homework)?:\*\*\s*(.+?)(?=\n\n|\n\*\*CLASS|\n#|$)/s);
  const extension = extMatch ? cleanText(extMatch[1]) : undefined;

  return {
    id: planId(),
    class_num: classNum,
    title: classTitle,
    swbat,
    standards,
    materials,
    procedure,
    assessment,
    assessment_type: assessType,
    ell_supports: ell,
    extension,
    sort_order: index,
  };
}

// ── Parse procedure section into timed steps ──
function parseProcedure(text: string): ProcedureStep[] {
  const steps: ProcedureStep[] = [];

  // Find the procedure section
  const procStart = text.search(/\*\*Procedure:\*\*/i);
  if (procStart === -1) return steps;

  // Find the end (next major section)
  const procSection = text.slice(procStart);
  const endMatch = procSection.search(/\n\*\*(?:Assessment|ELL Supports?|Extension):\*\*/i);
  const procText = endMatch > 0 ? procSection.slice(0, endMatch) : procSection;

  // Pattern 1: **Label (N min):** description
  const timedPattern = /\*\*(.+?)\s*(?:\((\d+)\s*min\))?\s*:\*\*\s*(.+?)(?=\n\*\*[A-Z]|\n\n\*\*|$)/gs;
  let match;
  let order = 0;

  while ((match = timedPattern.exec(procText)) !== null) {
    const label = cleanText(match[1]);
    const duration = match[2] ? parseInt(match[2]) : undefined;
    const desc = cleanText(match[3]);

    // Skip if this is a major section header we already handle
    if (['Procedure', 'Assessment', 'ELL Supports', 'Materials', 'SWBAT'].includes(label)) continue;

    steps.push({
      id: planId(),
      label,
      duration_min: duration,
      description: desc,
      sort_order: order++,
    });
  }

  // If the timed pattern didn't catch much, try blockquote-style activities
  if (steps.length <= 1) {
    const blockLines = procText.split('\n')
      .filter(l => l.trim().startsWith('>') || l.match(/^\s{4,}/))
      .map(l => l.replace(/^>\s*/, '').trim())
      .filter(Boolean);

    if (blockLines.length > 0) {
      // Group consecutive blockquote lines into activities
      let currentActivity: string[] = [];
      for (const line of blockLines) {
        if (line === '' || line === '>') {
          if (currentActivity.length > 0) {
            const full = currentActivity.join(' ');
            const labelMatch = full.match(/^(.+?):\s*(.*)/);
            steps.push({
              id: planId(),
              label: labelMatch ? cleanText(labelMatch[1]) : `Step ${steps.length + 1}`,
              description: labelMatch ? cleanText(labelMatch[2]) : cleanText(full),
              sort_order: steps.length,
            });
            currentActivity = [];
          }
        } else {
          currentActivity.push(line);
        }
      }
      // Flush last
      if (currentActivity.length > 0) {
        const full = currentActivity.join(' ');
        const labelMatch = full.match(/^(.+?):\s*(.*)/);
        steps.push({
          id: planId(),
          label: labelMatch ? cleanText(labelMatch[1]) : `Step ${steps.length + 1}`,
          description: labelMatch ? cleanText(labelMatch[2]) : cleanText(full),
          sort_order: steps.length,
        });
      }
    }
  }

  return steps;
}

// ═══════════════════════════════════════════════════════════════
// PHONICS SCOPE PARSER
// ═══════════════════════════════════════════════════════════════

function parsePhonicsScope(text: string): PhonicsPhase[] {
  const phases: PhonicsPhase[] = [];

  // Split by PHASE headers
  const phaseBlocks = text.split(/\*\*PHASE\s+/i);

  for (let i = 1; i < phaseBlocks.length; i++) {
    const block = phaseBlocks[i];
    const titleMatch = block.match(/^(\d+):\s*(.+?)\s*\((.+?)\)\*\*/);
    const phaseTitle = titleMatch
      ? `PHASE ${titleMatch[1]}: ${titleMatch[2].trim()}`
      : `PHASE ${i}`;
    const weeksLabel = titleMatch ? titleMatch[3] : '';

    const items: PhonicsWeek[] = [];

    // Parse week rows from the table
    const weekPattern = /Week\s+(\d+)\s+(.+?)\s+(RF\.\d+\.\d+(?:\.\w+)?(?:\s*\/\s*RF\.\d+\.\d+(?:\.\w+)?)?)\s+(.+?)(?=\n\s*Week|\n\s*$|\n\s*-)/gs;
    let wMatch;
    while ((wMatch = weekPattern.exec(block)) !== null) {
      items.push({
        id: planId(),
        week: parseInt(wMatch[1]),
        focus: cleanText(wMatch[2]),
        standard: cleanText(wMatch[3]),
        integration: cleanText(wMatch[4]),
      });
    }

    // Fallback: simpler line-by-line parse
    if (items.length === 0) {
      const lines = block.split('\n');
      for (const line of lines) {
        const simpleMatch = line.match(/Week\s+(\d+)\s+(.+?)(?:\s{2,}|\t)(RF\S+)/);
        if (simpleMatch) {
          items.push({
            id: planId(),
            week: parseInt(simpleMatch[1]),
            focus: cleanText(simpleMatch[2]),
            standard: cleanText(simpleMatch[3]),
            integration: '',
          });
        }
      }
    }

    phases.push({
      id: planId(),
      title: phaseTitle,
      weeks_label: weeksLabel,
      items,
      sort_order: i - 1,
    });
  }

  return phases;
}

// ═══════════════════════════════════════════════════════════════
// PA SCOPE PARSER
// ═══════════════════════════════════════════════════════════════

function parsePAScope(text: string): PAWeek[] {
  const weeks: PAWeek[] = [];
  const lines = text.split('\n');

  // Look for rows starting with week numbers
  let currentWeek: Partial<PAWeek> | null = null;

  for (const line of lines) {
    const weekMatch = line.match(/^\s*(\d+)\s+(.+)/);
    if (weekMatch && parseInt(weekMatch[1]) <= 20) {
      if (currentWeek && currentWeek.week) {
        weeks.push({
          id: planId(),
          week: currentWeek.week,
          focus: currentWeek.focus || '',
          activities: currentWeek.activities || '',
          standard: currentWeek.standard || '',
        });
      }
      currentWeek = {
        week: parseInt(weekMatch[1]),
        focus: cleanText(weekMatch[2]),
        activities: '',
        standard: '',
      };
    } else if (currentWeek && line.trim()) {
      // Continuation lines add to activities or standard
      const stdMatch = line.match(/(RF\.\d+\.\d+\S*)/);
      if (stdMatch) {
        currentWeek.standard = (currentWeek.standard || '') + (currentWeek.standard ? ', ' : '') + stdMatch[1];
      }
      const content = cleanText(line);
      if (content.length > 5 && !content.startsWith('**') && !content.startsWith('---')) {
        currentWeek.activities = (currentWeek.activities || '') + ' ' + content;
      }
    }
  }

  // Flush last
  if (currentWeek && currentWeek.week) {
    weeks.push({
      id: planId(),
      week: currentWeek.week,
      focus: currentWeek.focus || '',
      activities: currentWeek.activities?.trim() || '',
      standard: currentWeek.standard || '',
    });
  }

  return weeks;
}

// ═══════════════════════════════════════════════════════════════
// GRAMMAR SCOPE PARSER
// ═══════════════════════════════════════════════════════════════

function parseGrammarScope(text: string): GrammarWeek[] {
  const weeks: GrammarWeek[] = [];

  // The grammar table in pandoc markdown has rows separated by +---+
  // Each row starts with | weekNum | **topicNum -- TopicName** | Standard | SWBAT + Activities + Integration |
  // But topic names can wrap across multiple lines in the cell.

  // Split into row blocks by the +---+ separator
  const rowBlocks = text.split(/\+[-=]+\+[-=]+\+[-=]+\+[-=]+\+/).filter(b => b.trim());

  for (const block of rowBlocks) {
    // Skip header row
    if (block.includes('**Topic**') || block.includes('**Wk**') || !block.includes('SWBAT')) continue;

    // Join all lines, collapsing the table cell boundaries
    const cellLines = block.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract week number (first column)
    const weekMatch = block.match(/\|\s*(\d{1,2})\s/);
    if (!weekMatch) continue;
    const weekNum = parseInt(weekMatch[1]);

    // Extract topic number and name (second column, may wrap)
    // Collect all content from the topic column
    const topicParts: string[] = [];
    for (const line of cellLines) {
      const cols = line.split('|').map(c => c.trim());
      if (cols[2]) topicParts.push(cols[2]);
    }
    const topicFull = topicParts.join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    const topicNumMatch = topicFull.match(/^(\d{2})\s*[-\u2013]+\s*(.+)/);
    const topicNum = topicNumMatch ? topicNumMatch[1] : '';
    const topic = topicNumMatch ? topicNumMatch[2].trim() : topicFull;

    // Extract standard (third column)
    const stdParts: string[] = [];
    for (const line of cellLines) {
      const cols = line.split('|').map(c => c.trim());
      if (cols[3]) stdParts.push(cols[3]);
    }
    const standard = stdParts.join(', ').replace(/\*\*/g, '').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();

    // Extract SWBAT, Activities, Integration from fourth column
    const contentParts: string[] = [];
    for (const line of cellLines) {
      const cols = line.split('|').map(c => c.trim());
      if (cols[4]) contentParts.push(cols[4]);
    }
    const content = contentParts.join(' ').replace(/\s+/g, ' ');

    const swbatMatch = content.match(/SWBAT:\*?\*?\s*(.+?)(?:\*\s*\*\*Activities|\*\s*Activities|$)/i);
    const swbat = swbatMatch ? cleanText(swbatMatch[1]) : '';

    const actMatch = content.match(/Activities:\*?\*?\s*(.+?)(?:\*\*Integration|\*\s*\*\*Integration|$)/i);
    const activities = actMatch ? cleanText(actMatch[1]) : '';

    const intMatch = content.match(/Integration:\*?\*?\s*(.+?)$/i);
    const integration = intMatch ? cleanText(intMatch[1]) : '';

    weeks.push({
      id: planId(),
      week: weekNum,
      topic_num: topicNum,
      topic,
      standard,
      swbat,
      activities,
      integration,
    });
  }

  return weeks;
}

// ═══════════════════════════════════════════════════════════════
// UNIT OVERVIEW PARSER
// ═══════════════════════════════════════════════════════════════

function parseUnitOverview(text: string): UnitOverview {
  // Essential questions
  const eqs: string[] = [];
  const eqMatch = text.match(/Essential Questions[\s\S]*?(?=##|\n#)/i);
  if (eqMatch) {
    const nums = eqMatch[0].match(/\*\*\d+\.\*\*\s*(.+)/g);
    if (nums) eqs.push(...nums.map(n => cleanText(n.replace(/\*\*\d+\.\*\*\s*/, ''))));
  }

  // Enduring understandings
  const eus: string[] = [];
  const euMatch = text.match(/Enduring Understandings[\s\S]*?(?=##|\n#)/i);
  if (euMatch) {
    const bullets = euMatch[0].match(/[•\-]\s*(.+)/g);
    if (bullets) eus.push(...bullets.map(b => cleanText(b.replace(/^[•\-]\s*/, ''))));
  }

  // Standards
  const stds: { code: string; description: string }[] = [];
  const stdMatch = text.match(/Standards Addressed[\s\S]*?(?=##|\n#)/i);
  if (stdMatch) {
    const stdPattern = /\*\*([A-Z]+\.\d+\.\d+)\*\*\s+(.+?)(?=\n\s*\*\*[A-Z]|\n\n|$)/gs;
    let s;
    while ((s = stdPattern.exec(stdMatch[0])) !== null) {
      stds.push({ code: s[1], description: cleanText(s[2]) });
    }
  }

  // Stage 1
  const s1Match = text.match(/Stage 1[\s\S]*?(?=##\s*\*\*Stage 2|\n#)/i);
  const knowledge: string[] = [];
  const skills: string[] = [];
  const dispositions: string[] = [];

  if (s1Match) {
    const knBlock = extractColumn(s1Match[0], 'Knowledge');
    const skBlock = extractColumn(s1Match[0], 'Skills');
    const diBlock = extractColumn(s1Match[0], 'Dispositions');
    if (knBlock) knowledge.push(...splitBullets(knBlock));
    if (skBlock) skills.push(...splitBullets(skBlock));
    if (diBlock) dispositions.push(...splitBullets(diBlock));
  }

  // Stage 2
  const s2Match = text.match(/Stage 2[\s\S]*?(?=##|\n#)/i);
  let perfTitle = '';
  let perfDesc = '';
  if (s2Match) {
    const ptMatch = s2Match[0].match(/\*\*(.+?):\*\*\s*(.+?)(?=\n\n|$)/s);
    if (ptMatch) { perfTitle = cleanText(ptMatch[1]); perfDesc = cleanText(ptMatch[2]); }
  }

  // Pacing
  const pacing: UnitOverview['pacing'] = [];
  const pacingMatch = text.match(/Module Pacing[\s\S]*?(?=\n#)/i);
  if (pacingMatch) {
    const rowPattern = /\*\*(.+?)\*\*\s+(\d+)\s+\*(.+?)\*\s+(.+?)(?=\n\s*\*\*|\n\s*$)/gs;
    let pMatch;
    while ((pMatch = rowPattern.exec(pacingMatch[0])) !== null) {
      pacing.push({
        story: cleanText(pMatch[1]),
        classes: parseInt(pMatch[2]),
        genre: cleanText(pMatch[3]),
        focus: cleanText(pMatch[4]),
      });
    }
  }

  // Description
  const descMatch = text.match(/UNIT OVERVIEW\*\*\s*\n\s*\n(.+?)(?=\n\s*\n|##)/s);
  const description = descMatch ? cleanText(descMatch[1]) : '';

  return {
    description,
    essential_questions: eqs,
    enduring_understandings: eus,
    standards: stds,
    stage1: { knowledge, skills, dispositions },
    stage2: { title: perfTitle, description: perfDesc },
    pacing,
  };
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY SKELETON PARSER
// Parses the big week-by-week grid tables
// ═══════════════════════════════════════════════════════════════

function parseWeeklySkeleton(text: string): SkeletonWeek[] {
  const weeks: SkeletonWeek[] = [];

  // Split by WEEK headers
  const weekBlocks = text.split(/\|\s*\*\*WEEK\s+/i);

  for (let i = 1; i < weekBlocks.length; i++) {
    const block = weekBlocks[i];

    // Week number and title
    const headerMatch = block.match(/^(\d+)(?:[:\s]+)?(?:.*?\n)*?.*?\*\*/s);
    const weekNum = headerMatch ? parseInt(headerMatch[1]) : i;

    // Extract the title (which spans multiple table cells)
    const titleLines: string[] = [];
    const headerLines = block.split('\n');
    for (const line of headerLines) {
      if (line.includes('+===') || line.includes('+---') || line.includes('**DAY**')) break;
      const cellContent = line.replace(/^\|/, '').replace(/\|.*$/, '').trim();
      if (cellContent && !cellContent.startsWith('+')) {
        titleLines.push(cellContent.replace(/\*\*/g, '').trim());
      }
    }
    const weekTitle = titleLines.join(' ').replace(/\s+/g, ' ').trim();

    // Parse day rows
    const days: SkeletonDay[] = [];
    const dayBlocks = block.split(/\|\s*\*\*Day\s+(\d+)\*\*/);

    for (let d = 1; d < dayBlocks.length; d += 2) {
      const dayNum = parseInt(dayBlocks[d]);
      const dayContent = dayBlocks[d + 1] || '';

      // Extract subject
      const subjectMatch = dayContent.match(/\*\*(.+?)\*\*/);
      const subject = subjectMatch ? cleanText(subjectMatch[1]) : '';
      const subjectShort = subject.includes('Phonemic') ? 'PA'
        : subject.includes('Into Reading') ? 'IR'
        : subject.includes('Phonics') || subject.includes('SoR') ? 'SoR'
        : subject.includes('Grammar') ? 'Grammar'
        : subject;

      // Extract standard
      const stdMatch = dayContent.match(/Standard:\s*([A-Z]+\.\d+[\w.,\s]*)/i);
      const standard = stdMatch ? cleanText(stdMatch[1]) : '';

      // Extract SWBAT
      const swbatMatch = dayContent.match(/SWBAT:\*?\*?\s*(.+?)(?:\*\n|\*$)/s);
      const swbat = swbatMatch ? cleanText(swbatMatch[1]) : '';

      // Extract activities (everything after SWBAT that isn't a border)
      const actText = dayContent
        .replace(/\*Standard:.+?\*/g, '')
        .replace(/\*\*?SWBAT:.+?\*/gs, '')
        .replace(/\*\*.+?\*\*/g, '')
        .split('\n')
        .map(l => l.replace(/^\|/, '').replace(/\|.*$/, '').replace(/^\s*>\s*/, '').trim())
        .filter(l => l && !l.startsWith('+') && !l.startsWith('|'))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (dayNum >= 1 && dayNum <= 5) {
        days.push({
          id: planId(),
          day: dayNum,
          subject,
          subject_short: subjectShort,
          standard,
          swbat,
          activities: actText,
        });
      }
    }

    if (days.length > 0) {
      weeks.push({
        id: planId(),
        week: weekNum,
        title: weekTitle,
        days,
        sort_order: weekNum - 1,
      });
    }
  }

  return weeks;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function cleanText(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\\/g, '')
    .replace(/--/g, '\u2013')
    .replace(/``/g, '"')
    .replace(/''/g, "'")
    .trim();
}

function extractStandards(text: string): string[] {
  const allStds: string[] = [];
  const pattern = /([A-Z]{1,3}\.\d+\.\d+(?:\.\w+)?)/g;
  let m;
  // Only search in the first 500 chars (near SWBAT/header)
  const searchArea = text.slice(0, 500);
  while ((m = pattern.exec(searchArea)) !== null) {
    if (!allStds.includes(m[1])) allStds.push(m[1]);
  }
  return allStds;
}

function extractBetween(text: string, startLabel: string, endLabel: string): string {
  const startIdx = text.indexOf(startLabel);
  const endIdx = text.indexOf(endLabel);
  if (startIdx === -1) return '';
  const end = endIdx > startIdx ? endIdx : text.length;
  return cleanText(text.slice(startIdx + startLabel.length, end));
}

function extractAfterLabel(text: string, label: string): string {
  const idx = text.indexOf(label);
  if (idx === -1) return '';
  const rest = text.slice(idx + label.length);
  const endIdx = rest.search(/\n\*\*|[\n]{2}(?=[A-Z])/);
  return cleanText(rest.slice(0, endIdx > 0 ? endIdx : 200));
}

function extractTableContent(text: string): string {
  const lines = text.split('\n').filter(l => l.includes('Day') && l.includes('--'));
  return lines.map(l => cleanText(l.replace(/\|/g, ''))).join('; ') || '';
}

function extractColumn(text: string, header: string): string {
  const idx = text.indexOf(header);
  if (idx === -1) return '';
  return text.slice(idx + header.length, idx + header.length + 500);
}

function splitBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map(l => l.replace(/^[\s|+\-•*]+/, '').trim())
    .filter(l => l.length > 3 && !l.startsWith('#') && !l.startsWith('+'));
}
