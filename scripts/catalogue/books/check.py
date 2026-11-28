"""Checks book files for the Update the books page.

    python3 -I scripts/catalogue/books/check.py [--sor-old docs/catalogue/science-of-reading.txt] <book.json>…

Prints every problem, or "ok". The format is in FORMAT.md; objective lines
follow scripts/catalogue/objectives/BRIEF.md and the rules in its check.py.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'objectives'))
from check import problems as bank_problems  # noqa: E402

STRANDS = {'phonics', 'reading', 'writing', 'speaking', 'grammar', 'other'}
BOOK_KEYS = {'series', 'level', 'title', 'strand', 'color', 'kind', 'source', 'absorbs', 'units'}
UNIT_KEYS = {'title', 'summary', 'default_weeks', 'ccss', 'skill_tags', 'replaces', 'lessons', 'objectives'}
LESSON_KEYS = {'title', 'notes'}


def book_problems(b):
    out = []
    for k in ('series', 'level', 'source', 'units'):
        if k not in b: out.append(f'missing {k!r}')
    for k in set(b) - BOOK_KEYS: out.append(f'unknown book key {k!r}')
    if b.get('strand') and b['strand'] not in STRANDS: out.append(f"bad strand {b['strand']!r}")
    if b.get('kind') and b['kind'] not in ('sequence', 'anthology'): out.append(f"bad kind {b['kind']!r}")
    if b.get('series') == 'Grammar Workshop': out.append('Grammar Workshop is not rebuilt')
    units = b.get('units') or []
    if not units: out.append('no units')
    seen = set()
    for i, u in enumerate(units):
        t = (u.get('title') or '').strip()
        where = t or f'unit {i + 1}'
        if not t: out.append(f'unit {i + 1}: no title')
        if t.lower() in seen: out.append(f'{where}: repeated title')
        seen.add(t.lower())
        for k in set(u) - UNIT_KEYS: out.append(f'{where}: unknown key {k!r}')
        w = u.get('default_weeks', 2)
        if not isinstance(w, (int, float)) or not (0.5 <= w <= 6): out.append(f'{where}: default_weeks {w!r} (0.5 to 6)')
        ls = u.get('lessons') or []
        if not ls: out.append(f'{where}: no lessons')
        for j, l in enumerate(ls):
            if not (l.get('title') or '').strip(): out.append(f'{where}: lesson {j + 1} has no title')
            for k in set(l) - LESSON_KEYS: out.append(f'{where}: lesson {j + 1} has {k!r} (lessons carry title and notes only)')
            if re.search(r'students will', (l.get('notes') or '') + (l.get('title') or ''), re.I):
                out.append(f'{where}: lesson {j + 1} carries a "Students will" line; objectives go in the unit\'s list')
    # The unit objective lists, by the bank rules.
    bank = {'series': b.get('series'), 'level': b.get('level'), 'units': [{'title': u.get('title'), 'objectives': u.get('objectives') or []} for u in units]}
    out += bank_problems({'series': b.get('series'), 'level': b.get('level'), 'units': [{'title': u.get('title')} for u in units]}, bank)
    return out


def sor_old_titles(path):
    out = []
    for line in open(path, encoding='utf-8'):
        if line.startswith('Unit: '):
            out.append(line[6:].split(' | ')[0].strip())
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    old = None
    if args[:1] == ['--sor-old']:
        old = sor_old_titles(args[1]); args = args[2:]
    found = []
    books = []
    for p in args:
        b = json.load(open(p, encoding='utf-8'))
        books.append(b)
        found += [f'{os.path.basename(p)}: {x}' for x in book_problems(b)]
    if old is not None:
        claimed = {}
        for b in books:
            for u in b.get('units', []):
                for r in u.get('replaces', []) or []:
                    if r in claimed: found.append(f'old unit {r!r} replaced twice ({claimed[r]} and {u["title"]})')
                    claimed[r] = u['title']
        for t in old:
            if t not in claimed: found.append(f'old unit not replaced by any level: {t!r}')
        for r in claimed:
            if r not in old: found.append(f'replaces {r!r}, which is not an old unit title')
    print('\n'.join(found[:80]) + (f'\n… and {len(found) - 80} more' if len(found) > 80 else '') if found else 'ok')
    sys.exit(1 if found else 0)
