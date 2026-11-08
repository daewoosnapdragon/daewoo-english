# Writing unit objective banks

Daewoo English is an EFL program in a Korean elementary school. Teachers write a monthly lesson plan that is printed for parents. Each day says what the class does ("Into Reading: Cloudette") and one "Students will…" line. Each unit in the catalogue gets a short bank of objectives that a teacher taps onto that line. The bank is used as written: nobody reviews it, so it has to be right the first time.

## What to produce

For one book, a JSON file:

```json
{
  "series": "Into Reading",
  "level": "2",
  "units": [
    {
      "title": "M1 W1 · Clark the Shark",
      "objectives": [
        { "text": "describe how Clark changes from the start of the story to the end", "ccss": ["RL.2.3"], "wida": ["ELD-LA.2-3.Narrate.Interpretive"] }
      ]
    }
  ]
}
```

- `series` and `level` exactly as in the input file.
- Every unit of the input, in the same order, with `title` copied **exactly** (same characters, same dots and dashes). The seed matches units by title.
- Three to five objectives per unit. Science of Reading units may have two when the unit is a short review.

## How an objective reads

- It finishes the sentence "Students will …". Do **not** write "Students will" yourself. Start with a lower-case verb: "retell", "ask and answer", "read and spell", "use".
- A parent with everyday English understands it. No codes, no teacher jargon ("CVC", "digraph", "text features", "central idea" are fine only if said in plain words: "the main idea", "headings, photos and captions", "words with sh, like ship and fish").
- Specific to this unit. Name the story, the character, the topic, the sounds or a few of the words when it helps: "retell Clark the Shark in order: beginning, middle, end". Two units in the same week must not get the same bank.
- One idea per objective, 6 to 18 words. No full stop at the end.
- Cover different things across the bank: the reading or listening skill(s) the unit teaches, the words (name three or four of them), and something students say or write. For Hand in Hand: the conversation, the words and grammar pattern, The World around Us reading, the English Sounds, and the School Link project or subject.
- Use what the input gives you (lesson titles, the existing draft objectives, the summary with genre, words, conversation, phonics pattern). Do not invent plot details you are not sure of; when you only know the genre and title, keep it general to the genre ("tell what the author wants readers to learn about bees").

## Tags

- `ccss`: one to three Common Core codes the objective serves, written like the catalogue writes them: `RL.2.3`, `RI.3.2`, `L.2.4`, `SL.1.1`, `RF.1.3C`, `W.2.3`. Use the lesson codes the input already has where they fit. For Hand in Hand (no codes in the input) use the book's grade: Starter = K, Book 1 = grade 1, … Book 6 = grade 6, choosing SL for conversation, L for words and grammar, RI or RL for The World around Us, RF for English Sounds (RF stops at grade 5: use RF.5 for Book 6).
- `wida`: one or two WIDA 2020 language expectation codes, in this form:
  - `ELD-SI.<cluster>.Interpretive` or `ELD-SI.<cluster>.Expressive` for social and instructional language (classroom talk, greetings, conversation).
  - `ELD-LA.<cluster>.<Narrate|Inform|Explain|Argue>.<Interpretive|Expressive>` for language arts. Interpretive = reading or listening; Expressive = speaking or writing. Narrate = stories; Inform = facts and topics; Explain = how or why; Argue = opinions and claims.
  - `ELD-SC`, `ELD-SS`, `ELD-MA` in the same shape as LA for a School Link's science, social studies or math.
  - `<cluster>` is the book's grade cluster: `K`, `1`, `2-3`, `4-5`, `6-8`. Into Reading N and Hand in Hand Book N use grade N (Starter = K). Science of Reading uses the lowest grade in the unit's RF codes (RF.K → K, RF.1 → 1, RF.2 → 2-3).

## Done means

Write the file, then check it with:

```
python3 -I scripts/catalogue/objectives/check.py <input.json> <your-output.json>
```

and fix everything it reports until it prints `ok`.
