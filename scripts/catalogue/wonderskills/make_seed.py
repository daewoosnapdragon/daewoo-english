"""Writes supabase/seed-wonderskills.sql from books.json (see extract.py).

Usage: python3 -I scripts/catalogue/wonderskills/make_seed.py scripts/catalogue/wonderskills/books.json supabase/seed-wonderskills.sql

Decisions (Kyla, Nov 2026):
- Easy Reading, Rich Reading and Wonderskills Reading are taught one book per year, so each of a book's
  12 units gets DEFAULT_WEEKS = 3 (36 weeks). The publisher's syllabi pace a book in 12 weeks at two
  lessons a week; change DEFAULT_WEEKS to 1 for that pace.
- Two publisher typos in unit titles are corrected in books.json: Advanced 3 Unit 10 ("The Big BlizzardRocketing
  Into Space") and Master 1 Unit 1 ("Does Does").
- One unit per syllabus unit, titled "Unit 5 · Pack and Go"; the summary carries the theme, genre,
  strategy and skill. Two lessons per unit, one per syllabus day, with the day's activities, pages and
  homework in the notes and a drafted "Students will" objective (source 'claude', unconfirmed).
- Books whose syllabus was not supplied still get 12 units so a class can be placed and paced; their
  titles are placeholders to correct on the Bookshelf (titles can be edited without unplacing anything).
"""
import json, re, sys

DEFAULT_WEEKS = 3
SERIES = {  # name: (strand, colour, sort order) — as in migration-curriculum-catalogue.sql
    'Easy Reading': ('reading', 'ochre', 30),
    'Rich Reading': ('reading', 'teal', 40),
    'Wonderskills Reading': ('reading', 'berry', 50),
}
# Books with no usable syllabus: titles known from other sources, else placeholders.
PARTIAL = {
    ('Easy Reading', '1 Plus'): {1: ('Plants', 'My Garden')},  # sample lesson plan, unit 1 only
    ('Easy Reading', '2 Plus'): dict(enumerate([(None, t) for t in [  # unit titles from the SB answer key
        'We Want Honey', 'The Sick Tree', 'Where Does Food Come from?', 'The Fancy Hat', 'A Good Idea', 'Kate and the Seasons',
        'Going Camping', 'My Neighborhood', 'Neighborhood Party', 'Farm Fresh Finn', 'A Good Team', 'A Snow Day']], start=1)),
    ('Easy Reading', '3 Plus'): {},
    ('Rich Reading', 'Basic 2'): {},
}
FIXES = [('Comprehenion', 'Comprehension')]


def tidy(s):
    s = re.sub(r'\s+', ' ', s or '').strip()
    for a, b in FIXES:
        s = s.replace(a, b)
    return s


def q(s):
    s = tidy(s) if '\n' not in (s or '') else s
    assert '$q$' not in s
    return f'$q${s}$q$'


def objective(day, unit):
    acts = ' '.join(day['objectives']).lower()
    if day is unit['days'][0]:
        return f'Students will learn the key words and read “{unit["title"]}”.'
    skill = unit['skill'] or ('retelling' if 'retell' in acts else '')
    what = f' and practice {skill.lower()}' if skill else ' and check their understanding'
    return f'Students will reread “{unit["title"]}”{what}.'


def unit_sql(b, u, placeholder=False):
    summary = '' if placeholder and not u.get('theme') else '. '.join(x for x in [
        f"Theme: {tidy(u['theme'])}" if u.get('theme') else '',
        ' · '.join(tidy(x) for x in [u.get('genre', ''), u.get('strategy', ''), u.get('skill', '')] if tidy(x)),
    ] if x)
    if placeholder:
        summary = (summary + '. ' if summary else '') + 'Placeholder from the planning upload: check the title against the syllabus.'
    title = f"Unit {u['n']} · {tidy(u['title'])}" if u.get('title') else f"Unit {u['n']}"
    out = [f"    INSERT INTO curriculum_units (book_id, sort_order, title, summary, skill_tags, ccss_codes, default_weeks, source) VALUES "
           f"(b, {u['n']}, {q(title)}, {q(summary + ('.' if summary and not summary.endswith('.') else ''))}, ARRAY[]::text[], ARRAY[]::text[], {DEFAULT_WEEKS}, 'claude') RETURNING id INTO u;"]
    for i, d in enumerate(u.get('days', []), start=1):
        notes = '\n'.join(x for x in [', '.join(tidy(a) for a in d['objectives']), f"Material: {tidy(d['material'])}" if d['material'] else '', f"Homework: {tidy(d['homework'])}" if d['homework'] else ''] if x)
        name = 'Day 1 · Words and story' if i == 1 else 'Day 2 · Comprehension'
        out.append(f"    INSERT INTO curriculum_lessons (unit_id, sort_order, title, objective, notes, ccss_codes, skill_tags, source) VALUES "
                   f"(u, {i}, {q(name)}, {q(objective(d, u))}, {q(notes)}, ARRAY[]::text[], ARRAY[]::text[], 'claude');")
    return out


def book_sql(series, level, units, placeholder):
    name = f'{series} {level}'
    lines = [f'-- ── {name}: {len(units)} units{" (placeholder titles)" if placeholder else ""} ──', 'DO $seed$', 'DECLARE b UUID; u UUID; n INT;', 'BEGIN',
             f"  INSERT INTO curriculum_books (series_id, level_number, title, status) SELECT id, {q(level)}, '', 'confirmed' FROM curriculum_series WHERE lower(name) = lower({q(series)}) ON CONFLICT (series_id, lower(level_number)) DO NOTHING;",
             f"  SELECT bk.id INTO b FROM curriculum_books bk JOIN curriculum_series s ON s.id = bk.series_id WHERE lower(s.name) = lower({q(series)}) AND lower(bk.level_number) = lower({q(level)});",
             '  SELECT count(*) INTO n FROM curriculum_units WHERE book_id = b;',
             '  IF n > 0 THEN', f"    RAISE NOTICE '{name} already has % units; left as it is', n;", '  ELSE']
    for u in units:
        lines += unit_sql(None, u, placeholder)
    lines += ['  END IF;', 'END', '$seed$;', '']
    return lines


def main(src, out):
    books = json.load(open(src))
    sql = ['-- WonderSkills Easy Reading, Rich Reading and Reading (Intermediate, Advanced, Master): every unit of each',
           '-- book for the Bookshelf, from the publisher\'s 12-week syllabi. Generated by scripts/catalogue/wonderskills/make_seed.py.',
           '-- Run once in the Supabase SQL Editor after migration-curriculum-catalogue.sql. Safe to re-run: a book that already',
           '-- has units is left alone. Do NOT delete a book\'s units to reload it once any class has it placed: the delete',
           '-- cascades into every class\'s pacing. Correct titles on the Bookshelf or with UPDATEs instead.',
           f'-- Each unit has default weeks {DEFAULT_WEEKS} (one book a year). Books marked "placeholder titles" had no syllabus in',
           '-- the upload: they have 12 units so they can be placed now; fix their titles when the syllabus arrives.', '',
           'CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_books_series_level ON curriculum_books (series_id, lower(level_number));']
    for name, (strand, colour, order) in SERIES.items():
        sql.append(f"INSERT INTO curriculum_series (name, strand, color, sort_order) VALUES ({q(name)}, '{strand}', '{colour}', {order}) ON CONFLICT (lower(name)) DO NOTHING;")
    sql.append('')
    have = {(b['series'], b['level']) for b in books}
    for b in books:
        sql += book_sql(b['series'], b['level'], b['units'], False)
    for (series, level), known in PARTIAL.items():
        if (series, level) in have:
            continue
        units = [{'n': n, 'theme': (known.get(n) or (None, None))[0], 'title': (known.get(n) or (None, None))[1], 'days': []} for n in range(1, 13)]
        sql += book_sql(series, level, units, True)
    sql += ['-- Check: every book of the three series with its unit count. A book typed in by hand under another name',
            '-- ("Basic Plus 1" for "Basic 1 Plus") shows here as a near-duplicate with its own count.',
            "SELECT s.name AS series, bk.level_number AS level, count(u.id) AS units FROM curriculum_books bk JOIN curriculum_series s ON s.id = bk.series_id LEFT JOIN curriculum_units u ON u.book_id = bk.id",
            "WHERE lower(s.name) IN ('easy reading', 'rich reading', 'wonderskills reading') GROUP BY s.name, bk.level_number ORDER BY s.name, bk.level_number;"]
    open(out, 'w').write('\n'.join(sql) + '\n')
    print(f'{len(books)} books from syllabi, {len([k for k in PARTIAL if k not in have])} with placeholder titles → {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
