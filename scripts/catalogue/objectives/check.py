"""Checks an objective bank file against the book it was written for.

    python3 -I scripts/catalogue/objectives/check.py <input-book.json> <bank.json>

Prints every problem, or "ok". See BRIEF.md for the rules.
"""
import json
import re
import sys

CCSS = re.compile(r'^(RL|RI|RF|L|SL|W)\.(K|[1-8])\.\d{1,2}[A-Ga-g]?$')
WIDA_SI = re.compile(r'^ELD-SI\.(K|1|2-3|4-5|6-8)\.(Interpretive|Expressive)$')
WIDA_AREA = re.compile(r'^ELD-(LA|SC|SS|MA)\.(K|1|2-3|4-5|6-8)\.(Narrate|Inform|Explain|Argue)\.(Interpretive|Expressive)$')


def problems(book, bank):
    out = []
    if bank.get('series') != book['series'] or bank.get('level') != book['level']:
        out.append(f"series/level must be {book['series']!r} / {book['level']!r}")
    want = [u['title'] for u in book['units']]
    got = [u.get('title') for u in bank.get('units', [])]
    missing = [t for t in want if t not in got]
    extra = [t for t in got if t not in want]
    if missing: out.append(f"{len(missing)} units missing, first: {missing[:3]}")
    if extra: out.append(f"{len(extra)} titles not in the book, first: {extra[:3]}")
    if not missing and not extra and got != want: out.append('units are not in the book order')
    low = 2 if book['series'] == 'Science of Reading' else 3
    for u in bank.get('units', []):
        t = u.get('title')
        objs = u.get('objectives', [])
        if not (low <= len(objs) <= 5): out.append(f"{t}: {len(objs)} objectives (want {low} to 5)")
        seen = set()
        for o in objs:
            text = (o.get('text') or '').strip()
            words = len(text.split())
            if not text: out.append(f"{t}: empty objective"); continue
            if text.lower() in seen: out.append(f"{t}: repeated objective {text!r}")
            seen.add(text.lower())
            if text.lower().startswith('students will'): out.append(f"{t}: drop 'Students will' from {text!r}")
            if not text[0].islower(): out.append(f"{t}: start with a lower-case verb: {text!r}")
            if text.endswith('.'): out.append(f"{t}: no full stop: {text!r}")
            if not (4 <= words <= 20): out.append(f"{t}: {words} words: {text!r}")
            cc = o.get('ccss', [])
            if not (1 <= len(cc) <= 3): out.append(f"{t}: {len(cc)} ccss codes on {text!r}")
            for c in cc:
                if not CCSS.match(c): out.append(f"{t}: bad ccss {c!r}")
            wd = o.get('wida', [])
            if not (1 <= len(wd) <= 2): out.append(f"{t}: {len(wd)} wida codes on {text!r}")
            for w in wd:
                if not (WIDA_SI.match(w) or WIDA_AREA.match(w)): out.append(f"{t}: bad wida {w!r}")
    texts = {}
    for u in bank.get('units', []):
        key = tuple(sorted(o.get('text', '').lower() for o in u.get('objectives', [])))
        if key in texts and key: out.append(f"{u.get('title')}: same bank as {texts[key]}")
        texts[key] = u.get('title')
    return out


if __name__ == '__main__':
    book = json.load(open(sys.argv[1], encoding='utf-8'))
    bank = json.load(open(sys.argv[2], encoding='utf-8'))
    found = problems(book, bank)
    print('\n'.join(found[:60]) + (f'\n… and {len(found) - 60} more' if len(found) > 60 else '') if found else 'ok')
    sys.exit(1 if found else 0)
