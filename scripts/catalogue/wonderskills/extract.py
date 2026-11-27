"""Reads WonderSkills 12-week syllabi (.xlsx) into books.json for make_seed.py.

Usage: python3 -I scripts/catalogue/wonderskills/extract.py OUT.json FILE.xlsx [FILE.xlsx ...]

Each syllabus has a title row ("WonderSkills Rich Reading Basic 1"), a pace line
("*12 weeks (2 days/week): 24 lessons in total"), a header row (Month, Week, Day,
Unit, Title, [Genre], [Strategy], [Skill], Learning Objectives, Material(s),
Homework) and two rows per unit, one per day. The Unit cell reads "Unit 1\nTheme".
"""
import json, re, sys
import openpyxl

SERIES = [('WonderSkills Rich Reading ', 'Rich Reading'), ('WonderSkills Easy Reading ', 'Easy Reading'), ('WonderSkills Reading ', 'Wonderskills Reading')]


def level_name(raw):
    """'Basic Plus 1' → 'Basic 1 Plus', 'Plus 2' → '2 Plus', 'Intermediate 1' stays: the app's level naming."""
    m = re.match(r'^(.*?)\s*Plus\s+(\d+)$', raw)
    return (f'{m.group(1)} {m.group(2)} Plus').strip() if m else raw.strip()


def cell(v):
    return re.sub(r'[ \t]+', ' ', str(v)).strip() if v not in (None, '') else ''


def read(path):
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    title = next(cell(c) for r in rows for c in r if cell(c))
    series = level = None
    for prefix, name in SERIES:
        if title.startswith(prefix):
            series, level = name, level_name(title[len(prefix):])
    if not series:
        raise SystemExit(f'{path}: unknown series in title {title!r}')
    hi = next(i for i, r in enumerate(rows) if any(cell(c) == 'Unit' for c in r))
    head = {cell(c): j for j, c in enumerate(rows[hi]) if cell(c)}
    col = lambda *names: next((head[n] for n in names if n in head), None)
    cu, ct, cg, cs, ck, co, cm, ch = col('Unit'), col('Title'), col('Genre'), col('Strategy'), col('Skill'), col('Learning Objectives'), col('Material', 'Materials'), col('Homework')
    units = []
    for r in rows[hi + 1:]:
        get = lambda j: cell(r[j]) if j is not None and j < len(r) else ''
        u = get(cu)
        m = re.match(r'^Unit\s*(\d+)\s*(.*)$', u, re.S)
        if m:
            units.append({'n': int(m.group(1)), 'theme': cell(m.group(2).replace('\n', ' ')), 'title': get(ct).replace('\n', ' '),
                          'genre': get(cg).replace('\n', ' '), 'strategy': get(cs).replace('\n', ' '), 'skill': get(ck).replace('\n', ' '), 'days': []})
        if units and (get(co) or get(cm) or get(ch)):
            if m or len(units[-1]['days']) < 2:
                units[-1]['days'].append({'objectives': [cell(x.lstrip('-')) for x in get(co).split('\n') if cell(x.lstrip('-'))],
                                          'material': get(cm).replace('\n', ' / '), 'homework': get(ch).replace('\n', ' / ')})
    return {'series': series, 'level': level, 'source': title, 'units': units}


if __name__ == '__main__':
    out, files = sys.argv[1], sys.argv[2:]
    books = sorted((read(f) for f in files), key=lambda b: (b['series'], b['level']))
    for b in books:
        print(f"{b['series']} {b['level']}: {len(b['units'])} units, days {[len(u['days']) for u in b['units']]}")
    json.dump(books, open(out, 'w'), ensure_ascii=False, indent=1)
