"""Writes book files for the books already extracted from publisher files:
Into Reading 1-4, Hand in Hand Starter-6, Easy Reading, Rich Reading and
Wonderskills Reading. It reads the units and lessons from their seeds
(supabase/seed-into-reading.sql, seed-hand-in-hand.sql, seed-wonderskills.sql)
and each unit's objective list from scripts/catalogue/objectives/*.json, and
drops the lessons' own objectives: a unit's list is the one source.

    python3 -I scripts/catalogue/books/convert.py

Books whose units have no objective list (the placeholders) are skipped and listed.
"""
import glob
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
OUT = os.path.join(ROOT, 'scripts', 'catalogue', 'books')
SEEDS = ['seed-into-reading.sql', 'seed-hand-in-hand.sql', 'seed-wonderskills.sql']
SERIES = {  # name: strand, colour, kind (as the seeds create them)
    'Into Reading': ('reading', 'blue', 'anthology'), 'Hand in Hand': ('speaking', 'green', 'sequence'),
    'Easy Reading': ('reading', 'ochre', 'sequence'), 'Rich Reading': ('reading', 'teal', 'sequence'),
    'Wonderskills Reading': ('reading', 'berry', 'sequence'),
}
SOURCE = {
    'Into Reading': 'HMH Into Reading scope and sequence, grade {level}',
    'Hand in Hand': 'Hand in Hand 2nd ed. scope and sequence, Student Book {level}',
    'Easy Reading': 'WonderSkills Easy Reading {level} 12-week syllabus',
    'Rich Reading': 'WonderSkills Rich Reading {level} 12-week syllabus',
    'Wonderskills Reading': 'Wonderskills Reading {level} 12-week syllabus',
}


def values(s, i):
    """Parses one SQL VALUES tuple starting at s[i] == '('. Returns (list, end index)."""
    assert s[i] == '('
    i += 1
    out = []
    while True:
        while s[i] in ' \n\t': i += 1
        if s.startswith('$q$', i):
            j = s.index('$q$', i + 3); out.append(s[i + 3:j]); i = j + 3
        elif s[i] == "'":
            j = i + 1; buf = []
            while True:
                if s[j] == "'" and s[j + 1:j + 2] == "'": buf.append("'"); j += 2
                elif s[j] == "'": break
                else: buf.append(s[j]); j += 1
            out.append(''.join(buf)); i = j + 1
        elif s.startswith('ARRAY[', i):
            j = s.index(']', i); inner = s[i + 6:j]
            out.append([x[3:-3] if x.startswith('$q$') else x.strip("'") for x in re.findall(r"\$q\$.*?\$q\$|'(?:[^']|'')*'", inner)])
            i = j + 1
            if s.startswith('::text[]', i): i += 8
        else:
            m = re.match(r'[^,)]+', s[i:]); out.append(m.group(0).strip()); i += m.end()
        while s[i] in ' \n\t': i += 1
        if s[i] == ',': i += 1; continue
        if s[i] == ')': return out, i + 1


def parse_seed(path):
    s = open(path, encoding='utf-8').read()
    books = []
    pat = re.compile(r"INSERT INTO curriculum_books \(series_id, level_number, title, status\) SELECT id, (\$q\$.*?\$q\$|'[^']*'), .*? WHERE lower\(name\) = (?:lower\()?(\$q\$.*?\$q\$|'[^']*')|INSERT INTO curriculum_units \([^)]*\) VALUES |INSERT INTO curriculum_lessons \([^)]*\) VALUES ")
    for m in pat.finditer(s):
        if m.group(1):
            level = m.group(1).strip("'").replace('$q$', '')
            name = m.group(2).strip("'").replace('$q$', '')
            series = next(k for k in SERIES if k.lower() == name.lower())
            books.append({'series': series, 'level': level, 'units': []})
        elif m.group(0).startswith('INSERT INTO curriculum_units'):
            v, _ = values(s, m.end())
            books[-1]['units'].append({'title': v[2], 'summary': v[3], 'default_weeks': float(v[6]), 'ccss': v[5], 'skill_tags': v[4], 'lessons': []})
        else:
            v, _ = values(s, m.end())
            books[-1]['units'][-1]['lessons'].append({'title': v[2], 'notes': v[4]})
    return books


def slug(series, level):
    return re.sub(r'[^a-z0-9]+', '-', f'{series} {level}'.lower()).strip('-')


def main():
    banks = {}
    for p in glob.glob(os.path.join(ROOT, 'scripts', 'catalogue', 'objectives', '*.json')):
        b = json.load(open(p, encoding='utf-8'))
        banks[(b['series'], b['level'])] = {u['title']: u['objectives'] for u in b['units']}
    skipped, written = [], []
    for seed in SEEDS:
        for b in parse_seed(os.path.join(ROOT, 'supabase', seed)):
            bank = banks.get((b['series'], b['level']))
            if not bank or not all(u['title'] in bank for u in b['units']):
                skipped.append(f"{b['series']} {b['level']}"); continue
            strand, color, kind = SERIES[b['series']]
            for u in b['units']:
                u['objectives'] = bank[u['title']]
                w = u['default_weeks']; u['default_weeks'] = int(w) if w == int(w) else w
            book = {'series': b['series'], 'level': b['level'], 'title': '', 'strand': strand, 'color': color, 'kind': kind,
                    'source': SOURCE[b['series']].format(level=b['level'])}
            if b['series'] == 'Hand in Hand' and b['level'] == 'Starter': book['absorbs'] = ['S']
            book['units'] = b['units']
            name = slug(b['series'], b['level']) + '.json'
            with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
                json.dump(book, f, ensure_ascii=False, indent=1); f.write('\n')
            written.append(name)
    print(f'wrote {len(written)} books')
    if skipped: print('skipped (no objective list):', ', '.join(skipped))


if __name__ == '__main__':
    main()
