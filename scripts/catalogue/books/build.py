"""Bundles the book files into src/data/catalogue.json for the Update the books page.

    python3 -I scripts/catalogue/books/build.py

Each entry is {key: "series|level", version, book}; the version is a hash of the
book file, so the page can tell a book already loaded at this version (up to
date) from one whose file has changed since. Run check.py first.
"""
import glob
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', '..', 'src', 'data', 'catalogue.json')

entries = []
for p in sorted(glob.glob(os.path.join(HERE, '*.json'))):
    book = json.load(open(p, encoding='utf-8'))
    canon = json.dumps(book, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    entries.append({'key': f"{book['series']}|{book['level']}", 'version': hashlib.sha1(canon.encode('utf-8')).hexdigest()[:12], 'book': book})
entries.sort(key=lambda e: (e['book']['series'], e['book']['level'].zfill(3)))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(entries)} books, {os.path.getsize(OUT) // 1024} KB → src/data/catalogue.json')
