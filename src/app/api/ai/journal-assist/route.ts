import { getEffectiveUser } from '@/lib/effective-user';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const ACTION_PROMPTS: Record<string, string> = {
  organize: `Take the teacher's raw notes and organize them into a clean, formatted structure using HTML.
Use <b> for headings and key terms, <ul><li> for lists, <i> for emphasis.
Keep the teacher's original content but make it scannable and well-structured.
Do NOT add new content — only reorganize what's there.`,

  suggest_activities: `Based on the teacher's notes and the section topic, suggest 3-4 specific classroom activities.
Format as an HTML list with <b> activity names and brief descriptions.
Activities should be practical, ready-to-use, and appropriate for 2nd grade.
If the teacher has existing notes, build on them rather than replacing them.`,

  expand: `Take the teacher's notes and expand them with additional detail and teaching ideas.
Add specific examples, differentiation tips, or step-by-step procedures where helpful.
Format with <b>, <i>, <ul><li> for readability.
Preserve everything the teacher wrote and add to it.`,

  create_questions: `Based on the section topic and story, create 4-5 questions the teacher could use with students.
Include a mix of DOK levels (1-3). Format as a numbered list using HTML.
For each question, note the DOK level in <i>italics</i>.
If the teacher has notes about specific skills, align questions to those skills.`,
};

export async function POST(request: Request) {
  const { user, userId } = await getEffectiveUser();
  if (!user || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const body = await request.json();
  const { action, section, notes, book_num, module_num, story_title } = body;

  if (!action || !ACTION_PROMPTS[action]) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a helpful teaching assistant for an elementary school teacher (2nd grade, teaching in Korea with Korean ELL students).
You help organize and enhance their lesson planning notes.
IMPORTANT: Return ONLY HTML content. No markdown. No \`\`\` code blocks. No preamble or explanation.
Use simple HTML: <b>, <i>, <u>, <ul>, <ol>, <li>, <br>, <h3>. Nothing else.
Keep responses concise and practical — this goes directly into their planning journal.`;

  const userPrompt = `Story: "${story_title}" (Into Reading, Book ${book_num}, Module ${module_num})
Section: ${section}
${notes ? `Current notes:\n${notes.replace(/<[^>]+>/g, ' ').trim()}` : 'No notes yet.'}

Task: ${ACTION_PROMPTS[action]}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content.find(c => c.type === 'text');
    let html = text?.text || '';

    // Strip any markdown code fences that might sneak in
    html = html.replace(/```html?\n?/g, '').replace(/```\n?/g, '').trim();

    // If the teacher had existing notes and action is organize/expand, prepend is handled by the prompt
    // For suggest/questions, append to existing notes
    if ((action === 'suggest_activities' || action === 'create_questions') && notes) {
      html = notes + '<br><br>' + html;
    }

    return NextResponse.json({ html });
  } catch (err: any) {
    console.error('Journal AI error:', err);
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
