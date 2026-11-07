"""Turn the extracted Into Reading scope-and-sequence JSON into the Bookshelf paste format.

One unit per myBook text (so a class can place, reorder or skip single stories), one lesson per
comprehension skill with a "students will" line and the CCSS code chosen by grade and by the text's
genre, and one vocabulary lesson carrying the week's power words.

Usage: python3 -I make_paste.py <grade> <in.json> <out.txt>
       python3 -I make_paste.py --sql <out.sql> grade-1.json grade-2.json ...   (the seed for the SQL editor)
"""
import json
import re
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

def build(grade, src):
    """The units of one grade as data: [{title, weeks, summary, tags, codes, lessons:[{title, objective, notes, codes, tags}]}]."""
    weeks = json.load(open(src))
    out, unmapped = [], set()
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
            lessons, unit_codes = [], []
            for s in skills:
                text, codes = codes_for(s, domain, grade)
                if text is None:
                    unmapped.add(s)
                    text, codes = f'practise {s.lower()} with this text.', []
                for c in codes:
                    if c not in unit_codes:
                        unit_codes.append(c)
                lessons.append({'title': s, 'objective': f'Students will {text}', 'notes': '', 'codes': codes, 'tags': [tag(s)]})
            if words:
                vc = [f'L.{grade}.6', f'L.{grade}.4']
                for c in vc:
                    if c not in unit_codes:
                        unit_codes.append(c)
                lessons.append({'title': f'Vocabulary · {", ".join(words)}', 'objective': f'Students will use the power words {", ".join(words)} when they talk and write about the text.', 'notes': "the week's words, shared by both texts of the week", 'codes': vc, 'tags': ['vocabulary in context']})
            others = [x['title'] for x in texts if x is not t]
            summary = f'{genre}{author}. Module {mod} · {title}, week {wk}' + (f', paired with {"; ".join(others)}' if others else '') + '.'
            tags = list(dict.fromkeys([tag(s) for s in skills] + (['vocabulary in context'] if words else [])))
            out.append({'title': f'M{mod} W{wk} · {t["title"]}', 'weeks': 2, 'summary': summary, 'tags': tags, 'codes': unit_codes, 'lessons': lessons})
    return out, unmapped, len(weeks)


def emit_paste(units):
    lines = []
    for u in units:
        lines.append(f"Unit: {u['title']} | weeks: {u['weeks']} | summary: {u['summary']} | skills: {', '.join(u['tags'])} | ccss: {', '.join(u['codes'])}")
        for l in u['lessons']:
            cc = f" | ccss: {', '.join(l['codes'])}" if l['codes'] else ''
            nn = f" | notes: {l['notes']}" if l['notes'] else ''
            lines.append(f"- {l['title']} | {l['objective']}{cc} | skills: {', '.join(l['tags'])}{nn}")
    return '\n'.join(lines) + '\n'


def q(text):
    """A SQL string literal: dollar-quoted so apostrophes need no escaping; an empty one is plain ''
    (never $q$$q$, whose middle $$ would end the surrounding DO block early)."""
    return f'$q${text}$q$' if text else "''"


def arr(items):
    return 'ARRAY[' + ', '.join(q(x) for x in items) + ']::text[]' if items else "'{}'::text[]"


def emit_sql(grades):
    """One file for every grade: series and books created if missing, units and lessons only for a book with none yet."""
    out = ["-- Into Reading 1 to 4: units and lessons for the Bookshelf, generated from the scope-and-sequence extraction.",
           "-- Run once in the Supabase SQL Editor after migration-curriculum-catalogue.sql. Safe to re-run: a book that",
           "-- already has units is left alone. To load a corrected version, first delete the book's units (the lessons go",
           "-- with them):  DELETE FROM curriculum_units WHERE book_id = (SELECT b.id FROM curriculum_books b JOIN curriculum_series s ON s.id = b.series_id WHERE lower(s.name) = 'into reading' AND b.level_number = '1');",
           "", "CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_books_series_level ON curriculum_books (series_id, lower(level_number));",
           "INSERT INTO curriculum_series (name, strand, color, sort_order) VALUES ('Into Reading', 'reading', 'blue', 20) ON CONFLICT (lower(name)) DO NOTHING;", ""]
    all_tags = []
    for grade, units in grades:
        for u in units:
            for t in u['tags'] + [t for l in u['lessons'] for t in l['tags']]:
                if t not in all_tags:
                    all_tags.append(t)
    out.append("INSERT INTO curriculum_skills (code, label, strand, sort_order)")
    out.append("SELECT t, initcap(t), 'reading', 200 FROM unnest(" + arr(all_tags) + ") AS t ON CONFLICT (code) DO NOTHING;")
    out.append("")
    for grade, units in grades:
        out.append(f"-- ── Into Reading {grade}: {len(units)} texts, {sum(len(u['lessons']) for u in units)} lessons ──")
        out.append("DO $seed$")
        out.append("DECLARE b UUID; u UUID; n INT;")
        out.append("BEGIN")
        out.append(f"  INSERT INTO curriculum_books (series_id, level_number, title, status) SELECT id, '{grade}', '', 'confirmed' FROM curriculum_series WHERE lower(name) = 'into reading' ON CONFLICT (series_id, lower(level_number)) DO NOTHING;")
        out.append(f"  SELECT bk.id INTO b FROM curriculum_books bk JOIN curriculum_series s ON s.id = bk.series_id WHERE lower(s.name) = 'into reading' AND lower(bk.level_number) = '{grade}';")
        out.append("  SELECT count(*) INTO n FROM curriculum_units WHERE book_id = b;")
        out.append(f"  IF n > 0 THEN RAISE NOTICE 'Into Reading {grade} already has % units; left as it is', n; RETURN; END IF;")
        for i, unit in enumerate(units, 1):
            out.append(f"  INSERT INTO curriculum_units (book_id, sort_order, title, summary, skill_tags, ccss_codes, default_weeks, source) VALUES (b, {i}, {q(unit['title'])}, {q(unit['summary'])}, {arr(unit['tags'])}, {arr(unit['codes'])}, {unit['weeks']}, 'claude') RETURNING id INTO u;")
            for j, l in enumerate(unit['lessons'], 1):
                out.append(f"  INSERT INTO curriculum_lessons (unit_id, sort_order, title, objective, notes, ccss_codes, skill_tags, source) VALUES (u, {j}, {q(l['title'])}, {q(l['objective'])}, {q(l['notes'])}, {arr(l['codes'])}, {arr(l['tags'])}, 'claude');")
        out.append(f"  RAISE NOTICE 'Into Reading {grade}: {len(units)} units loaded';")
        out.append("END $seed$;")
        out.append("")
    return '\n'.join(out)


def main(argv):
    if argv[0] == '--sql':
        # python3 -I make_paste.py --sql out.sql grade-1.json grade-2.json ...
        grades = []
        for src in argv[2:]:
            g = int(re.search(r'grade-(\d)', src).group(1))
            units, unmapped, _ = build(g, src)
            if unmapped:
                print('UNMAPPED skills:', sorted(unmapped))
            grades.append((g, units))
        open(argv[1], 'w').write(emit_sql(grades))
        print('wrote', argv[1], 'for grades', [g for g, _ in grades])
        return
    grade, src, dst = int(argv[0]), argv[1], argv[2]
    units, unmapped, nweeks = build(grade, src)
    open(dst, 'w').write(emit_paste(units))
    print(f"grade {grade}: {nweeks} weeks, {len(units)} units, {sum(len(u['lessons']) for u in units)} lessons -> {dst}")
    if unmapped:
        print('UNMAPPED skills:', sorted(unmapped))


if __name__ == '__main__':
    main(sys.argv[1:])
