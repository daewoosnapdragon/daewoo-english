import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { normalizeExtractedRubric, MAX_CRITERIA } from '@/lib/rubricImport'
import { bandForGrade } from '@/components/curriculum/rubric-library'

// ─── POST /api/rubric-import ─────────────────────────────────────
// A teacher's own rubric (PDF or a photo of one) comes in as multipart form
// data. Claude reads the page and returns the criteria in the paper's own
// shape; normalizeExtractedRubric then fits that to the app's four-level
// rubric and lists what needs a look. Needs ANTHROPIC_API_KEY on the server.

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 15 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

const ExtractedRubric = z.object({
  name: z.string().describe('The rubric’s title as printed, or a short name for the task it scores if there is no title.'),
  band: z.enum(['k2', 'g35']).nullable().describe('k2 if the paper is written for kindergarten to grade 2, g35 for grades 3 to 5, null if it does not say.'),
  criteria: z.array(z.object({
    label: z.string().describe('The criterion name as printed, e.g. "Organization".'),
    levels: z.array(z.string()).describe('The descriptor for each performance level, ordered from the LOWEST performance to the HIGHEST, however the paper lays them out. Full sentences as printed.'),
    level_names: z.array(z.string()).describe('The level headings as printed, in the same order as levels (e.g. "1 Beginning"). Empty if the paper has none.'),
    standard: z.string().nullable().describe('A Common Core ELA code printed on the row (W.3.1, RL.K.2, SL.4.1), else null. Do not invent one.'),
  })),
  notes: z.array(z.string()).describe('Anything a teacher should know that did not fit: a weighting rule, a row that was skipped, a part that was unreadable. Empty if nothing.'),
})

const SYSTEM = `You read scoring rubrics that elementary English teachers upload, and return their content as data so the rubric can be rebuilt inside a gradebook app.

The app scores every criterion on a 0–4 scale (0 = no evidence, 1 = needs guidance, 2 = developing, 3 = meets, 4 = exceeds). You do not convert to that scale yourself: return the levels exactly as the paper has them, ordered from lowest performance to highest, and the app does the fitting.

Rules:
- One criterion per row (or per column, if the paper is turned the other way). Keep the paper's wording; fix only obvious OCR breaks such as a word split across lines.
- Levels run lowest to highest in your output even when the paper prints the top level first.
- If a cell holds a score range or label only (e.g. "3 – Proficient") with no descriptor, return that label as the descriptor rather than an empty string.
- Copy a standard code only when it is printed. Leave standard null otherwise.
- Put anything you could not place into notes. Do not drop a criterion silently.
- At most ${MAX_CRITERIA} criteria.
- If the file is not a rubric at all, return an empty criteria list and say what the file is in notes.`

function errorJson(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return errorJson(503, 'Rubric import is not set up on this server yet: add ANTHROPIC_API_KEY to the environment and redeploy.')
  }

  let form: FormData
  try { form = await req.formData() } catch { return errorJson(400, 'Send the file as multipart form data.') }
  const file = form.get('file')
  if (!(file instanceof File)) return errorJson(400, 'No file was uploaded.')
  if (file.size === 0) return errorJson(400, 'The file is empty.')
  if (file.size > MAX_BYTES) return errorJson(413, `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 15 MB. Export the rubric at a lower resolution, or just the rubric pages.`)
  const gradeRaw = Number(form.get('grade'))
  const grade = Number.isFinite(gradeRaw) ? gradeRaw : 3

  const type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
  const isPdf = type === 'application/pdf'
  const isImage = (IMAGE_TYPES as readonly string[]).includes(type)
  if (!isPdf && !isImage) return errorJson(415, 'Upload a PDF, or a PNG, JPEG or WebP photo of the rubric.')

  const data = Buffer.from(await file.arrayBuffer()).toString('base64')
  const fileBlock: Anthropic.Beta.BetaContentBlockParam = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: type as ImageType, data } }

  const client = new Anthropic()
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium', format: zodOutputFormat(ExtractedRubric) },
      messages: [{
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: `This rubric is for grade ${grade === 0 ? 'K' : grade}. Read it and return its criteria and levels.` },
        ],
      }],
    })

    if (response.stop_reason === 'refusal') return errorJson(422, 'The reader declined this file. Try a cleaner scan, or build the rubric by hand.')
    if (response.stop_reason === 'max_tokens') return errorJson(422, 'The rubric is too long to read in one go. Upload only the rubric pages.')
    if (!response.parsed_output) return errorJson(502, 'The reader did not return a rubric. Try again, or build it by hand.')

    const result = normalizeExtractedRubric(response.parsed_output, bandForGrade(grade))
    return NextResponse.json({ ...result, fileName: file.name })
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return errorJson(503, 'The server’s ANTHROPIC_API_KEY was rejected. Check the key and redeploy.')
    if (error instanceof Anthropic.RateLimitError) return errorJson(429, 'The reader is busy. Wait a minute and try again.')
    if (error instanceof Anthropic.BadRequestError) return errorJson(400, `The file could not be read: ${error.message}`)
    if (error instanceof Anthropic.APIConnectionError) return errorJson(502, 'Could not reach the reader. Check the server’s network and try again.')
    if (error instanceof Anthropic.APIError) return errorJson(502, `The reader returned an error (${error.status}). Try again in a moment.`)
    console.error('rubric-import:', error)
    return errorJson(500, 'Something went wrong while reading the file.')
  }
}
