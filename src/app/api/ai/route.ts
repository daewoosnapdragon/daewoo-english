import { NextRequest, NextResponse } from 'next/server'

// ─── Gemini API Configuration ────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured. Add it to your Vercel environment variables.')
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return text.trim()
}

// ─── System Prompts ──────────────────────────────────────────────────

const COMMENT_SYSTEM = `You are a professional English language teacher at an elementary school in Korea writing report card comments for English Language Learners (grades 1-5). Your comments must be:

- Written in clear, professional English suitable for Korean parents who may read them with translation
- 4-6 sentences long for report cards, 2-4 sentences for progress reports
- Based ONLY on the data provided — never invent details
- Focused on observable academic performance, not personality judgments
- Aware of ELL context: students are Korean speakers learning English
- Varied in sentence structure — avoid starting every sentence with the student's name
- Using the student's first name naturally (not every sentence)
- NEVER mention specific percentage scores or letter grades — parents see those on the report card itself
- Instead of numbers, use phrases like "performing well," "showing growth," "needs additional support"
- When mentioning WIDA levels, explain what it means practically, not just the number
- When noting growth areas, frame constructively: what the student CAN do and what the next step is

You respond with ONLY the comment text. No quotes, no labels, no preamble.`

const ASSESSMENT_SYSTEM = `You are an ELL curriculum specialist helping teachers at an elementary school in Korea design standards-aligned assessments for English Language Learners (grades 1-5).

You will receive:
- The grade level and English proficiency class (Lily=lowest through Snapdragon=highest)
- The domain (reading, phonics, writing, speaking, language)
- Selected CCSS standards to assess
- Assessment type (formative, summative, or performance_task)
- Desired length category

Your job is to produce a structured assessment BLUEPRINT (not actual questions). Return a JSON object with:
{
  "name": "Suggested assessment name",
  "items": [
    { "standard": "RL.2.1", "questionType": "selected_response|constructed_response|oral|performance", "count": 3, "pointsEach": 1, "note": "Brief description of what to assess" }
  ],
  "maxScore": 15,
  "estimatedMinutes": 15,
  "scaffoldingNotes": "Brief ELL scaffolding advice for administering this assessment",
  "tips": "1-2 sentences on what to look for when grading"
}

Guidelines:
- Match question complexity to the class proficiency level (Lily/Camellia = very simplified, Snapdragon = near grade level)
- Formative assessments: 5-10 items, quick checks, 10-15 minutes
- Summative assessments: 10-20 items, comprehensive, 20-30 minutes  
- Performance tasks: 1-3 extended items, 15-30 minutes
- Always suggest ELL-appropriate question types (e.g., pointing/matching for low proficiency, not essays)
- Points should be simple integers that sum to the maxScore

Respond with ONLY valid JSON. No markdown, no backticks, no explanation.`

const BEHAVIOR_SYSTEM = `You are helping an elementary school English teacher in Korea summarize behavior observation data for professional communication. Your summaries must be:

- Strictly observational and factual — describe patterns, never diagnose
- Professional in tone — suitable for sharing with homeroom teachers or administrators
- Organized chronologically or by pattern
- Specific about contexts (antecedents), observed behaviors, and what happened after (consequences)
- Include frequency and intensity trends when the data supports it
- Written in 3-5 sentences
- NEVER speculate about causes, diagnoses, or home life
- NEVER use labels like ADHD, ODD, autism, etc.

Respond with ONLY the summary text. No quotes, no labels, no preamble.`

// ─── Task Handlers ───────────────────────────────────────────────────

function buildCommentPrompt(data: any): string {
  const { student, reportType, tone, domainGrades, overallGrade, prevDomainGrades, prevOverall,
    widaLevels, readingData, behaviorCount, goals, semesterName, attendanceData } = data

  const lines: string[] = []
  lines.push(`Student: ${student.english_name} (Grade ${student.grade}, ${student.english_class} class)`)
  lines.push(`Report type: ${reportType === 'progress' ? 'Mid-semester progress report (shorter, forward-looking)' : 'End-of-semester report card (summative)'}`)
  lines.push(`Tone: ${tone}`)
  lines.push(`Semester: ${semesterName}`)

  // Domain grades
  const domainLabels: Record<string, string> = { reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language' }
  const scored = Object.entries(domainGrades || {}).filter(([, v]) => v != null)
  if (scored.length > 0) {
    lines.push(`\nDomain performance (percentage):`)
    scored.forEach(([dom, val]) => {
      const label = domainLabels[dom] || dom
      const prev = prevDomainGrades?.[dom]
      lines.push(`  ${label}: ${(val as number).toFixed(1)}%${prev != null ? ` (previous semester: ${prev.toFixed(1)}%)` : ''}`)
    })
  }
  if (overallGrade != null) {
    lines.push(`Overall: ${overallGrade.toFixed(1)}%${prevOverall != null ? ` (previous: ${prevOverall.toFixed(1)}%)` : ''}`)
  }

  // WIDA
  if (widaLevels && Object.keys(widaLevels).length > 0) {
    const WIDA_NAMES: Record<number, string> = { 1: 'Entering', 2: 'Emerging', 3: 'Developing', 4: 'Expanding', 5: 'Bridging', 6: 'Reaching' }
    lines.push(`\nWIDA proficiency levels:`)
    Object.entries(widaLevels).forEach(([domain, level]) => {
      lines.push(`  ${domain}: Level ${level} (${WIDA_NAMES[level as number] || ''})`)
    })
  }

  // Reading
  if (readingData) {
    lines.push(`\nReading fluency:`)
    if (readingData.latestCwpm != null) lines.push(`  Current CWPM: ${readingData.latestCwpm}`)
    if (readingData.trend) lines.push(`  Trend: ${readingData.trend}`)
    if (readingData.readingLevel) lines.push(`  Reading level: ${readingData.readingLevel}`)
  }

  // Attendance
  if (attendanceData) {
    lines.push(`\nAttendance: ${attendanceData.present} present, ${attendanceData.absent} absent, ${attendanceData.tardy} tardy`)
  }

  // Behavior
  if (behaviorCount != null && behaviorCount > 0) {
    lines.push(`\nBehavior logs this semester: ${behaviorCount}`)
  }

  // Goals
  if (goals && goals.length > 0) {
    lines.push(`\nLearning goals:`)
    goals.forEach((g: any) => {
      lines.push(`  "${g.goal_text}" — status: ${g.status}${g.baseline_value ? ` (baseline: ${g.baseline_value}, target: ${g.target_value}, current: ${g.current_value || 'n/a'})` : ''}`)
    })
  }

  return lines.join('\n')
}

function buildAssessmentPrompt(data: any): string {
  const { grade, englishClass, domain, standards, assessmentType, lengthCategory } = data

  const lines: string[] = []
  lines.push(`Grade: ${grade}`)
  lines.push(`English class: ${englishClass} (ability level: ${getClassLevel(englishClass)})`)
  lines.push(`Domain: ${domain}`)
  lines.push(`Assessment type: ${assessmentType}`)
  lines.push(`Length: ${lengthCategory}`)
  lines.push(`\nSelected standards to assess:`)
  standards.forEach((s: any) => {
    lines.push(`  ${s.code}: ${s.description || s.text || ''}`)
  })

  return lines.join('\n')
}

function getClassLevel(cls: string): string {
  const levels: Record<string, string> = {
    Lily: 'Beginning — very limited English, needs heavy scaffolding',
    Camellia: 'Early Intermediate — basic conversational, limited academic English',
    Daisy: 'Intermediate — growing independence, benefits from graphic organizers',
    Sunflower: 'High Intermediate — can work semi-independently, refining academic language',
    Rose: 'Advanced — near grade-level work, occasional support needed',
    Snapdragon: 'Highest — performs at or above grade level expectations',
  }
  return levels[cls] || 'Unknown'
}

function buildBehaviorPrompt(data: any): string {
  const { student, logs } = data

  const lines: string[] = []
  lines.push(`Student: ${student.english_name} (Grade ${student.grade}, ${student.english_class} class)`)
  lines.push(`Number of behavior logs: ${logs.length}`)
  lines.push(`Date range: ${logs[logs.length - 1]?.date || '?'} to ${logs[0]?.date || '?'}`)
  lines.push(`\nBehavior log entries (most recent first):`)

  logs.forEach((log: any) => {
    const parts = [`  ${log.date}`]
    if (log.time) parts[0] += ` at ${log.time}`
    parts.push(`Type: ${log.type}`)
    if (log.activity) parts.push(`During: ${log.activity}`)
    if (log.antecedents?.length) parts.push(`Antecedent: ${log.antecedents.join(', ')}`)
    if (log.behaviors?.length) parts.push(`Behavior: ${log.behaviors.join(', ')}`)
    if (log.consequences?.length) parts.push(`Consequence: ${log.consequences.join(', ')}`)
    if (log.intensity > 1) parts.push(`Intensity: ${log.intensity}/5`)
    if (log.frequency > 1) parts.push(`Frequency: ${log.frequency}x`)
    if (log.duration) parts.push(`Duration: ${log.duration}`)
    if (log.note) parts.push(`Note: ${log.note}`)
    lines.push(parts.join(' | '))
  })

  return lines.join('\n')
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { task, data } = body

    if (!task || !data) {
      return NextResponse.json({ error: 'Missing task or data' }, { status: 400 })
    }

    let result: string

    switch (task) {
      case 'report_comment':
      case 'progress_comment': {
        const prompt = buildCommentPrompt({ ...data, reportType: task === 'progress_comment' ? 'progress' : 'report_card' })
        result = await callGemini(COMMENT_SYSTEM, prompt)
        break
      }

      case 'assessment_blueprint': {
        const prompt = buildAssessmentPrompt(data)
        const raw = await callGemini(ASSESSMENT_SYSTEM, prompt)
        // Validate JSON
        try {
          JSON.parse(raw)
          result = raw
        } catch {
          // Try to extract JSON from response
          const match = raw.match(/\{[\s\S]*\}/)
          if (match) {
            JSON.parse(match[0]) // validate
            result = match[0]
          } else {
            throw new Error('Invalid JSON response from AI')
          }
        }
        break
      }

      case 'behavior_summary': {
        const prompt = buildBehaviorPrompt(data)
        result = await callGemini(BEHAVIOR_SYSTEM, prompt)
        break
      }

      default:
        return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: error.message || 'AI generation failed' },
      { status: 500 }
    )
  }
}
