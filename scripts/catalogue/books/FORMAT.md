# Book files

One JSON file per book, named `<series>-<level>.json` in lower case with dashes (`super-phonics-2.json`, `science-of-reading-3.json`, `hand-in-hand-starter.json`). The Update the books page (Curriculum → Bookshelf) loads them from `src/data/catalogue.json`, which `build.py` writes, and swaps each book's units for these. Design: `docs/superpowers/specs/2026-11-28-book-rebuild-design.md`.

```json
{
  "series": "Super Phonics",              // exactly the series name in the app
  "level": "2",                           // the book's level_number ("Starter", "Basic 1 Plus", "3")
  "title": "",                            // the book's own title when the series name is not enough ("Alphabet")
  "strand": "phonics", "color": "rose", "kind": "sequence",   // only used if the series does not exist yet
  "source": "Super Phonics 3rd ed. Teacher's Guide, Book 2",  // where the content came from
  "absorbs": ["S"],                       // optional: other levels of this series folded into this book
  "units": [
    {
      "title": "Unit 1 · -at, -an, -ag",  // "Unit N · name" where the book numbers its units
      "summary": "Key words: cat, mat, hat … Sight words: a, has",   // facts from the source, plain text
      "default_weeks": 2,
      "ccss": ["RF.1.3B"], "skill_tags": ["short a", "word families"],
      "replaces": ["Alphabet · Set 1: a, b, t, s, m"],   // optional: old unit titles this unit takes over
      "lessons": [ { "title": "Listen and learn", "notes": "SB pp. 6–7 · Audio 02–05" } ],
      "objectives": [ { "text": "blend the sounds in words like cat, fan and bag", "ccss": ["RF.1.3B"], "wida": ["ELD-SI.1.Interpretive"] } ]
    }
  ]
}
```

Rules (checked by `python3 -I scripts/catalogue/books/check.py <files>`):

- Lessons have a title and notes only, never an objective or a "Students will" line. A unit's objectives are its list, written to `../objectives/BRIEF.md`: 3 to 5 lines (2 to 5 for Science of Reading), lower-case verb first, no full stop, 4 to 20 words, 1 to 3 CCSS codes, 1 to 2 WIDA codes.
- Unit titles are unique within a book. `default_weeks` is between 0.5 and 6.
- Nothing from teachers' lesson plans. Everything comes from the publisher's guide, syllabus or scope and sequence named in `source`.
- Science of Reading: every old unit title in `docs/catalogue/science-of-reading.txt` must appear in exactly one level's `replaces` (`check.py --sor-old docs/catalogue/science-of-reading.txt science-of-reading-*.json`).
- Grammar Workshop is not rebuilt.
