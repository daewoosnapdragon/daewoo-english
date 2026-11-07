"""Turn the extracted Into Reading scope-and-sequence JSON into the Bookshelf paste format.

One unit per myBook text (so a class can place, reorder or skip single stories), one lesson per
comprehension skill with a "students will" line and the CCSS code chosen by grade and by the text's
genre, and one vocabulary lesson carrying the week's power words.

Usage: python3 -I make_paste.py <grade> <in.json> <out.txt>
"""
import json
import sys

# Literature genres take RL codes; everything else is informational (RI).
LITERATURE = {
    'fantasy', 'realistic fiction', 'fairy tale', 'song', 'poetry', 'poem', 'narrative poetry', 'fable', 'folktale',
    'drama', 'play', 'historical fiction', 'myth', 'legend', 'tall tale', 'humorous fiction', 'science fiction',
    'adventure', 'mystery', 'fiction', 'traditional tale', 'pourquoi tale', 'trickster tale', 'graphic novel',
    'lyric poetry', 'free verse', 'narrative nonfiction', 'narrative fiction', 'autobiographical fiction', 'play', 'legend', 'tall tale', 'myth',  # narrative nonfiction is informational in CCSS; see below
}
# Narrative nonfiction and biography read like stories but are RI in the standards.
INFORMATIONAL_OVERRIDE = {'narrative nonfiction', 'biography', 'autobiography', 'memoir'}

def domain_of(genre: str) -> str:
    g = genre.strip().lower()
    if g in INFORMATIONAL_OVERRIDE:
        return 'RI'
    if any(g == x or g.startswith(x) for x in LITERATURE):
        return 'RL'
    return 'RI'

# skill -> (students-will template, {domain: standard number} or a fixed code list)
# {d} is RL or RI from the text's genre; {g} is the grade.
SKILLS = {
    'Story Structure': ('identify the characters, setting and major events of the story and how they fit together.', {'RL': '3', 'RI': '3'}),
    'Characters': ('describe the characters and explain how their actions and words move the story along.', {'RL': '3', 'RI': '3'}),
    'Setting': ('describe the setting and say how it matters to the story.', {'RL': '3', 'RI': '3'}),
    'Plot': ('describe the plot: the problem, the main events and how it is resolved.', {'RL': '3', 'RI': '3'}),
    'Literary Elements': ('describe the characters, setting and plot and how they work together.', {'RL': '3', 'RI': '3'}),
    'Elements of Poetry': ('find the rhythm, rhyme and repeated words in a poem and say what they do.', {'RL': '4', 'RI': '4'}),
    'Elements of Drama': ('name the parts of a play (cast, scenes, dialogue, stage directions) and how they tell the story.', {'RL': '5', 'RI': '5'}),
    'Ask and Answer Questions': ('ask and answer questions about the text, pointing to the words that answer them.', {'RL': '1', 'RI': '1'}),
    "Author's Purpose": ("say why the author wrote the text and what they want the reader to think or do.", {'RL': '6', 'RI': '8'}),
    "Author's Craft": ("explain the choices the author made, in words and structure, and the effect they have.", {'RL': '4', 'RI': '8'}),
    'Monitor and Clarify': ('notice when the text stops making sense and use rereading, pictures and context to fix it.', {'RL': '10', 'RI': '10'}),
    'Make Inferences': ('use clues in the text and what they already know to work out what is not said directly.', {'RL': '1', 'RI': '1'}),
    'Make Connections': ('connect the text to themselves, to other texts and to the world.', {'RL': '10', 'RI': '10'}),
    'Make and Confirm Predictions': ('predict what will happen next from the text and check the prediction as they read.', {'RL': '10', 'RI': '10'}),
    'Predict': ('predict what will happen next from the text and check the prediction as they read.', {'RL': '10', 'RI': '10'}),
    'Create Mental Images': ('make pictures in their mind from the words and use them to understand the text.', {'RL': '10', 'RI': '10'}),
    'Visualize': ('make pictures in their mind from the words and use them to understand the text.', {'RL': '10', 'RI': '10'}),
    'Synthesize': ('put together ideas from across the text to say something new about it.', {'RL': '2', 'RI': '2'}),
    'Evaluate': ("judge the text: whether the author's ideas and evidence are convincing and why.", {'RL': '6', 'RI': '8'}),
    'Retell': ('retell the text in order, including the key details.', {'RL': '2', 'RI': '2'}),
    'Summarize': ('summarize the text in their own words, keeping the main points and leaving out small details.', {'RL': '2', 'RI': '2'}),
    'Topic and Central Idea': ('name the topic and the central idea of the text and the details that support it.', {'RL': '2', 'RI': '2'}),
    'Central Idea': ('state the central idea of the text and the key details that support it.', {'RL': '2', 'RI': '2'}),
    'Main Idea': ('state the main idea of the text and the key details that support it.', {'RL': '2', 'RI': '2'}),
    'Theme': ('work out the theme of the story from what the characters do and learn.', {'RL': '2', 'RI': '2'}),
    'Ideas and Support': ("find the author's ideas and the reasons and evidence given for them.", {'RL': '1', 'RI': '8'}),
    'Text Organization': ('say how the text is organized (for example by sequence, cause and effect, or problem and solution) and why.', {'RL': '5', 'RI': '5'}),
    'Text Structure': ('say how the text is organized (for example by sequence, cause and effect, or problem and solution) and why.', {'RL': '5', 'RI': '5'}),
    'Chronological Order': ('put the events of the text in time order and use words that signal it.', {'RL': '3', 'RI': '3'}),
    'Text Features': ('use text features (headings, captions, labels, bold words) to find and understand information.', {'RL': '5', 'RI': '5'}),
    'Text and Graphic Features': ('use text and graphic features (headings, captions, maps, diagrams) to find and understand information.', {'RL': '7', 'RI': '7'}),
    'Media Techniques': ('explain the techniques a video or other media uses (sound, images, words) and what they add.', {'RL': '7', 'RI': '7'}),
    'Content-Area Words': ('work out the meaning of subject words from the text and use them.', ['L.{g}.4', 'L.{g}.6']),
    'Figurative Language': ('find figurative language (similes, metaphors, idioms) and explain what it means in the text.', {'RL': '4', 'RI': '4'}),
    'Point of View': ('say who is telling the story and how that shapes what the reader knows.', {'RL': '6', 'RI': '6'}),
    'Compare and Contrast': ('compare and contrast two texts, characters or ideas and support the comparison with details.', {'RL': '9', 'RI': '9'}),
    'Cause and Effect': ('explain what happened and why, using cause and effect language.', {'RL': '3', 'RI': '3'}),
    'Describe Characters': ('describe the characters and explain how their actions and words move the story along.', {'RL': '3', 'RI': '3'}),
    'Character Traits': ('describe a character\'s traits, motivations and feelings using evidence from the text.', {'RL': '3', 'RI': '3'}),
    'Literary Devices': ('find literary devices the author uses and explain their effect.', {'RL': '4', 'RI': '4'}),
    'Persuasive Techniques': ("find the techniques the author uses to persuade and judge how well they work.", {'RL': '8', 'RI': '8'}),
    'Narrative Nonfiction': ('tell what is fact in a true story and how the author makes it read like a story.', {'RL': '5', 'RI': '5'}),
    'Nonfiction Text Features': ('use text features (headings, captions, labels, bold words) to find and understand information.', {'RL': '5', 'RI': '5'}),
    'Sequence of Events': ('put the events of the text in order and use words that signal it.', {'RL': '3', 'RI': '3'}),
    'Genre': ('name the genre of the text and the features that show it.', {'RL': '5', 'RI': '5'}),
    'Genre Characteristics': ('name the genre of the text and the features that show it.', {'RL': '5', 'RI': '5'}),
    'Literary Devices and Craft': ('explain the choices the author made and the effect they have.', {'RL': '4', 'RI': '8'}),
    'Explain Scientific Ideas': ('explain the scientific ideas in the text using its details.', {'RL': '3', 'RI': '3'}),
    'Explain Historical Events': ('explain the historical events in the text and how they connect.', {'RL': '3', 'RI': '3'}),
    'Analyze Arguments': ("find the author's claim and the reasons and evidence for it, and judge them.", {'RL': '8', 'RI': '8'}),
    'Connect to Texts': ('connect the text to themselves, to other texts and to the world.', {'RL': '10', 'RI': '10'}),
    'Connect Text and Visuals': ('explain how the pictures and words work together to tell the story or give information.', {'RL': '7', 'RI': '7'}),
    'Character': ('describe the characters and explain how their actions and words move the story along.', {'RL': '3', 'RI': '3'}),
    'Retell/Summarize': ('retell or summarize the text in order, keeping the main points.', {'RL': '2', 'RI': '2'}),
    'Identify Claim': ("find the author's claim and the reasons and evidence given for it.", {'RL': '8', 'RI': '8'}),
    'Idioms': ('explain what the idioms in the text mean and how they are used.', ['L.{g}.5']),
    'Idioms, Adages, and Proverbs': ('explain the idioms, adages and proverbs in the text and what they mean.', ['L.{g}.5']),
    'Adages and Proverbs': ('explain the adages and proverbs in the text and what they mean.', ['L.{g}.5']),
    'Simile and Metaphor': ('find similes and metaphors and explain what they compare and why.', ['L.{g}.5']),
    'Graphic Features': ('use graphic features (maps, diagrams, charts, photos) to find and understand information.', {'RL': '7', 'RI': '7'}),
}

# RL.K.8 and RL.x.8 do not exist; RL "author's purpose" maps to RL.x.6 instead; an RL claim/argument skill falls back to RI.
NO_RL_8 = True
MAX_MODULE = 10  # modules 11 and 12 are genre studies that re-read earlier texts


# Which texts a skill fits. LIT: stories, poems, plays. INFO: informational, opinion, biography. MEDIA: videos.
# Anything else fits every text. In a week with both kinds of text, a text gets only the skills that fit it;
# when that would leave a text with nothing, it keeps the whole list.
LIT_ONLY = {'Story Structure', 'Characters', 'Character', 'Setting', 'Plot', 'Literary Elements', 'Elements of Poetry', 'Elements of Drama',
            'Theme', 'Describe Characters', 'Character Traits', 'Literary Devices'}
INFO_ONLY = {'Ideas and Support', 'Identify Claim', 'Text Features', 'Nonfiction Text Features', 'Text and Graphic Features', 'Graphic Features',
             'Central Idea', 'Topic and Central Idea', 'Main Idea', 'Content-Area Words', 'Analyze Arguments', 'Persuasive Techniques',
             'Explain Scientific Ideas', 'Explain Historical Events', 'Narrative Nonfiction'}
MEDIA_ONLY = {'Media Techniques'}

def is_media(genre):
    g = genre.lower()
    return 'video' in g or 'media' in g

def skills_for(text, texts, skills):
    domain = domain_of(text.get('genre', ''))
    media = is_media(text.get('genre', ''))
    any_media = any(is_media(t.get('genre', '')) for t in texts)
    domains = {domain_of(t.get('genre', '')) for t in texts}
    out = []
    for sk in skills:
        if sk in MEDIA_ONLY and any_media and not media:
            continue
        if len(domains) > 1:
            if sk in LIT_ONLY and domain != 'RL':
                continue
            if sk in INFO_ONLY and domain != 'RI':
                continue
        out.append(sk)
    return out or list(skills)

def codes_for(skill, domain, grade):
    entry = SKILLS.get(skill)
    if not entry:
        return None, None
    text, spec = entry
    if isinstance(spec, list):
        return text, [c.format(g=grade) for c in spec]
    n = spec.get(domain, spec.get('RI'))
    d = domain
    if d == 'RL' and n == '8':
        d = 'RI'
    return text, [f'{d}.{grade}.{n}']

def tag(skill):
    return skill.lower().replace("'", '').replace('’', '')

def main(grade, src, dst):
    weeks = json.load(open(src))
    out, unmapped, count_units, count_lessons = [], set(), 0, 0
    for w in weeks:
        if w['module'] > MAX_MODULE:
            continue
        mod, title, wk = w['module'], w.get('moduleTitle', ''), w['week']
        words = [x for x in w.get('powerWords', []) if x]
        texts = w.get('texts', [])
        for t in texts:
            genre = t.get('genre', '')
            domain = domain_of(genre)
            author = f" by {t['author']}" if t.get('author') else ''
            skills = skills_for(t, texts, [s for s in w.get('skills', []) if s])
            lesson_lines, unit_codes = [], []
            for s in skills:
                text, codes = codes_for(s, domain, grade)
                if text is None:
                    unmapped.add(s)
                    text, codes = f'practise {s.lower()} with this text.', []
                for c in codes:
                    if c not in unit_codes:
                        unit_codes.append(c)
                cc = f' | ccss: {", ".join(codes)}' if codes else ''
                lesson_lines.append(f'- {s} | Students will {text}{cc} | skills: {tag(s)}')
            if words:
                vc = [f'L.{grade}.6', f'L.{grade}.4']
                for c in vc:
                    if c not in unit_codes:
                        unit_codes.append(c)
                lesson_lines.append(f'- Vocabulary · {", ".join(words)} | Students will use the power words {", ".join(words)} when they talk and write about the text. | ccss: {", ".join(vc)} | skills: vocabulary in context | notes: the week\'s words, shared by both texts of the week')
            others = [x['title'] for x in texts if x is not t]
            summary = f'{genre}{author}. Module {mod} · {title}, week {wk}' + (f', paired with {"; ".join(others)}' if others else '') + '.'
            tags = [tag(s) for s in skills] + (['vocabulary in context'] if words else [])
            out.append(f'Unit: M{mod} W{wk} · {t["title"]} | weeks: 2 | summary: {summary} | skills: {", ".join(dict.fromkeys(tags))} | ccss: {", ".join(unit_codes)}')
            out.extend(lesson_lines)
            count_units += 1
            count_lessons += len(lesson_lines)
    open(dst, 'w').write('\n'.join(out) + '\n')
    print(f'grade {grade}: {len(weeks)} weeks, {count_units} units, {count_lessons} lessons -> {dst}')
    if unmapped:
        print('UNMAPPED skills:', sorted(unmapped))

if __name__ == '__main__':
    main(int(sys.argv[1]), sys.argv[2], sys.argv[3])
