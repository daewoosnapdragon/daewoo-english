# Catalogue paste files

Text files in the shape the Bookshelf page reads (Curriculum → Curriculum map → Bookshelf → open the book → Draft units and lessons from the contents → paste → Read the lines → Save as suggested). One file per book. Everything lands marked "Suggested by Claude" until admin confirms it.

## Into Reading 1 to 4

Made 7 Nov 2026 from the HMH scope-and-sequence PDFs, under these decisions from Kyla:

- **Only the myBook texts and their comprehension skills.** Big Books, Read Alouds, Teacher Read-Alouds, foundational skills, writing workshop, speaking and listening, response to text and English language development are left out.
- **One unit per myBook text**, not per module, so a class can place a module's stories in any order, skip the ones it does not use, and give each the weeks it really takes. The unit title is `M<module> W<week> · <text>`; the summary carries the genre, the author where the grid prints one, the module name, and the text it is paired with that week.
- **Default weeks: 2 per text**, a placeholder. Pace varies by teacher, sometimes a module takes a semester, so the number is set on each placement.
- **One lesson per comprehension skill** with a "students will" line and the CCSS code chosen by grade and by the text's genre: stories, poems and plays take RL codes, informational, opinion and biography take RI, with author's purpose and claims on RI.x.8. Reading strategies (monitor and clarify, make connections, predictions, mental images) sit on RL/RI.x.10.
- **A skill is given only to the text it fits** when a week pairs a story with an informational text: story structure, characters, theme and elements of poetry go to the story; central idea, text features, ideas and support, claims go to the informational text; media techniques go to the video. When a week's texts are all one kind, every skill goes to each.
- **Vocabulary** is one lesson per text carrying the week's Power Words (grades 1 and 2) or Critical Vocabulary (grades 3 and 4), tagged L.x.6 and L.x.4. The same words appear on both texts of a week; drop one if that bothers you.
- **Modules 11 and 12 are left out.** They are genre studies that re-read texts from modules 1 to 10 with no vocabulary. Change `MAX_MODULE` in the generator to include them.

The extraction (one JSON per grade, texts, genres, skills and words per week) and the generator that turns it into these files are in `scripts/catalogue/into-reading/`. Regenerate with:

```
python3 -I scripts/catalogue/into-reading/make_paste.py 1 scripts/catalogue/into-reading/grade-1.json docs/catalogue/into-reading-1.txt
```

Counts: grade 1 has 60 texts and 267 lessons, grade 2 has 60 and 274, grade 3 has 50 and 238, grade 4 has 53 and 258. Grades 3 and 4 print no authors in the reading grid, so their summaries name none.

Things to check when confirming: the grid lists some week-level skills that belong to the Big Book rather than the myBook text (for example elements of poetry on a week whose poem was read aloud); drop the lesson where that is the case. Genre strings are copied as printed, so combined ones like "Drama/Myth" or "Informational Text and Interview" appear as is.
