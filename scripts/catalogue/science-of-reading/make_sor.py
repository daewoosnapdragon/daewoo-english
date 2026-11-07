"""Science of Reading, Systematic Phonics (Sarah's Teaching Snippets): the full phonics sequence as catalogue units.

One unit per pattern, titled "<Section> · <Pattern>" so the Bookshelf groups them by section. Each unit has a
lesson to teach the pattern (students will read and spell words with it) and, where the sequence lists them, a
lesson for the high-frequency words. The sequence's notes become the unit summary. Default weeks 1; the class
picks the patterns it teaches and the term is shared across them.

Usage: python3 -I make_sor.py            writes docs/catalogue/science-of-reading.txt and supabase/seed-science-of-reading.sql
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# section, pattern, examples, high-frequency words, notes, skill tags, ccss codes
S = []
def row(section, pattern, ex='', hfw='', notes='', tags=(), codes=()):
    S.append({'section': section, 'pattern': pattern, 'examples': ex, 'hfw': hfw, 'notes': notes, 'tags': list(tags), 'codes': list(codes)})

AK = 'Alphabet'
ak_note = 'Connect the familiar sound to the new symbol. Point out what the mouth, tongue and teeth do. Have a visual for each letter. Model blending the sounds to make words, starting with VC and CV words and nonsense words. Make sure students know the difference between vowels and consonants.'
for s in ['Set 1: a, b, t, s, m', 'Set 2: f, c, i, p', 'Set 3: h, l, n, o', 'Set 4: g, d, r, k', 'Set 5: j, v, z, u', 'Set 6: e, w, y, x, q']:
    row(AK, s, '', '', ak_note, ['letter sounds', 'blending'], ['RF.K.1D', 'RF.K.3A', 'RF.K.2D'])

CS = 'Closed Syllables'
cvc_note = 'CVC words are consonant-vowel-consonant; VC words are vowel-consonant. Focus on what the mouth is doing for each vowel sound. Use a keyword for each vowel. Teach decoding strategies: Touch and Say, reading onset and rime, successive blending. If needed, start with words that begin with consonants that stretch (f, l, m, n, r, s, v, z). Every syllable needs a vowel sound.'
row(CS, 'CVC & VC Words: Short a', 'cat, fan, bag', 'at, am, an, can, man, ran, had, as, has, was', cvc_note, ['short a', 'cvc'], ['RF.K.3B', 'RF.1.2C', 'RF.1.3B'])
row(CS, 'CVC & VC Words: Short i', 'fin, big, sit', 'in, if, it, big, did, him, six, is, his', cvc_note, ['short i', 'cvc'], ['RF.K.3B', 'RF.1.2C', 'RF.1.3B'])
row(CS, 'CVC & VC Words: Short o', 'hot, log, rod', 'on, got, not, of', cvc_note, ['short o', 'cvc'], ['RF.K.3B', 'RF.1.2C', 'RF.1.3B'])
row(CS, 'CVC & VC Words: Short u', 'fun, nut, hug', 'up, us, but, run, put', cvc_note, ['short u', 'cvc'], ['RF.K.3B', 'RF.1.2C', 'RF.1.3B'])
row(CS, 'CVC & VC Words: Short e', 'net, pen, web', 'let, get, red, yes', cvc_note, ['short e', 'cvc'], ['RF.K.3B', 'RF.1.2C', 'RF.1.3B'])
row(CS, 'CVC Words: All Short Vowels Together', '', '', 'Time to practise to automaticity. Duration will vary.', ['cvc', 'fluency'], ['RF.1.3B', 'RF.1.4B'])
row(CS, 'Morphology: Suffix -s', 'hits, bugs, wins', '', 'Teach both nouns and verbs with suffix -s. Introduce the terms base word and suffix.', ['suffixes'], ['RF.1.3F', 'L.1.4C'])
dig_note = 'Digraphs are two or more letters that represent one sound. These are consonant digraphs because they represent a consonant sound. Sound boxes help to show this.'
row(CS, 'Consonant Digraphs: sh', 'ship, wish', 'she, wash', dig_note, ['consonant digraphs'], ['RF.1.3A'])
row(CS, 'Consonant Digraphs: ch', 'chop, such', '', dig_note, ['consonant digraphs'], ['RF.1.3A'])
row(CS, 'Consonant Digraphs: th', 'that, math', 'the, that, this, then, with, than, them, both', 'Voiced and unvoiced th: both sounds are made the same way, but you use your voice for one and not the other.', ['consonant digraphs'], ['RF.1.3A'])
row(CS, 'Consonant Digraphs: wh', 'when', 'when, which, what', 'Only a few words to use at this point with wh (when, what, whip, which).', ['consonant digraphs'], ['RF.1.3A'])
row(CS, 'Consonant Digraphs: Review all', '', '', 'Time to practise to automaticity. Duration will vary.', ['consonant digraphs', 'fluency'], ['RF.1.3A'])
row(CS, 'Morphology: Suffix -es', 'dishes, buzzes', '', 'Words that end with the sounds /s/, /ch/, /z/ or /sh/ (s, x, z, sh, ch) use suffix -es instead of -s.', ['suffixes'], ['RF.1.3F', 'L.1.4C'])
blend_note = 'Consonant blends are two or more consonants next to each other that each keep their own sound, unlike digraphs, which represent one sound.'
row(CS, 'Beginning Blends', 'step, frog, plum', 'and, must, help, just, went, stop, best, next, jump, last, want, from', blend_note, ['consonant blends'], ['RF.1.2B', 'RF.1.3B'])
row(CS, 'Ending Blends', 'tent, lift, jump', '', blend_note, ['consonant blends'], ['RF.1.2B', 'RF.1.3B'])
row(CS, 'Review Together', '', '', 'Time to practise to automaticity. Duration will vary.', ['cvc', 'consonant digraphs', 'consonant blends', 'fluency'], ['RF.1.3B', 'RF.1.4B'])
row(CS, 'Morphology: Suffix -ed', 'jumped, rested', '', 'Suffix -ed can make three sounds: /t/, /d/ and /id/. Added to a base word, it makes the past tense.', ['suffixes'], ['RF.1.3F', 'L.1.4C'])
row(CS, 'Double Consonants: ll, ff, ss, zz', 'fill, mess', 'will, off, well, full, pull', 'Rule: when a one-syllable word ends with a short vowel followed by f, l, s or z, double that consonant.', ['spelling rules'], ['RF.1.3B', 'L.1.2D'])
row(CS, 'Consonant Digraphs: ck', 'rock, sack', 'black', 'Rule: when a one-syllable word ends with a short vowel followed by the /k/ sound, use ck. Otherwise use k.', ['consonant digraphs', 'spelling rules'], ['RF.1.3A', 'L.1.2D'])
row(CS, 'Consonant Digraphs: tch', 'catch', 'watch', 'Rule: when a word ends with a short vowel followed by the /ch/ sound, use tch. Otherwise use ch.', ['consonant digraphs', 'spelling rules'], ['RF.1.3A', 'L.1.2D'])
row(CS, 'Morphology: Suffix -ing', 'jumping', '', 'Suffix -ing means it is happening right now.', ['suffixes'], ['RF.1.3F', 'L.1.4C'])
row(CS, 'Exceptions: ild, old, ost, ind, olt', 'kind, fold, wild, most', 'old, cold, find, kind, hold, mind', 'These syllables are closed, but the vowel does not make the expected short sound: ild, old, ost, ind, olt all have long vowel sounds.', ['long vowel exceptions'], ['RF.1.3C', 'RF.2.3F'])
row(CS, '-ng and -nk (& new grapheme: ng)', 'sing, wink, bank, rang', 'bring, thing, think, thank, drink, sing, long', 'ing/ink makes the /ĭ/ sound; ang/ank has the /ă/ sound.', ['consonant digraphs'], ['RF.1.3A', 'RF.1.3B'])
row(CS, '<all> spells /ŏl/', 'ball, call', 'all, fall, small, call', 'When you hear /ŏl/ at the end of a word, you will usually spell it all. Exception: doll.', ['spelling rules'], ['RF.1.3B', 'L.1.2D'])
row(CS, 'Beginning /k/ spelling rule', 'camp, cost, kit, kelp', '', 'Rule: use k if e, i or y follows; otherwise use c.', ['spelling rules'], ['L.1.2D'])
row(CS, 'Digraph & Triple Blends (str, spr, spl, scr)', 'shrub, splash, string', '', '', ['consonant blends'], ['RF.1.2B', 'RF.1.3B'])
row(CS, 'Morphology Rule: Doubling Rule', 'rubbed, hopping', '', 'Rule: when a one-syllable word has one vowel followed by one consonant, double that consonant before adding a vowel suffix.', ['suffixes', 'spelling rules'], ['RF.2.3E', 'L.2.2D'])

OS = 'Open Syllables'
row(OS, 'One-syllable Open', 'me, we, baby, robot', 'he, me, be, we, go, no, so, she; irregular: do, to', 'Syllables that end with a vowel. The vowel sound is long.', ['syllables', 'open syllables'], ['RF.1.3D', 'RF.1.3E', 'RF.2.3A'])
row(OS, 'Y as a vowel (long i)', 'by, my, try, cry', 'my, by, why', 'Rule: English words do not end with the letter i. If you hear the sound /ī/ at the end of a word, usually use y.', ['long i igh y', 'open syllables'], ['RF.1.3C', 'L.1.2D'])
row(OS, 'Morphology: Drop the y, make it an i', 'tries, flies', '', 'When a word ends with a consonant then y, drop the y and change it to i before adding suffixes, except -ing.', ['suffixes', 'spelling rules'], ['RF.2.3E', 'L.2.2D'])

SE = 'Silent e'
vce_note = 'VCe pattern: vowel-consonant-e. The first vowel says its name and the e is silent. This is one of silent e’s six jobs: it also makes c say /s/ and g say /j/, keeps words from ending in v, keeps a word from looking plural (house), and gives a syllable a written vowel (consonant -le).'
row(SE, 'VCe Pattern: a_e', 'cake, game', 'make, made, gave, take, came, ate', vce_note, ['long a vce'], ['RF.1.3C'])
row(SE, 'VCe Pattern: i_e', 'fine, smile', 'like, five, time, ride, white, live', vce_note, ['long i vce'], ['RF.1.3C'])
row(SE, 'VCe Pattern: o_e', 'mole, home', 'those, more, move, one, done, some, come', vce_note, ['long o vce'], ['RF.1.3C'])
row(SE, 'VCe Pattern: u_e', 'cube, mule', 'here, these, where, there', vce_note, ['long u vce'], ['RF.1.3C'])
row(SE, 'VCe Pattern: Review all together', '', '', 'Time to practise to automaticity. Duration will vary.', ['long a vce', 'long i vce', 'long o vce', 'long u vce', 'fluency'], ['RF.1.3C', 'RF.2.3B'])
row(SE, '<ce>', 'race, mice, chance', 'place, chance, once', 'Silent e makes c say /s/ when e, i or y follows.', ['soft c and g'], ['RF.2.3F', 'L.2.2D'])
row(SE, '<ge> and <dge> spelling rule', 'page, hinge, bridge', 'change', 'Silent e makes g say /j/. When a word ends with /j/ right after a short vowel, use dge; otherwise ge.', ['soft c and g', 'spelling rules'], ['RF.2.3F', 'L.2.2D'])
row(SE, '<ve>', 'give, have, valve', 'have, give, live', 'English words do not end in v: a word that ends with the sound /v/ gets a silent e after it.', ['spelling rules'], ['RF.2.3F', 'L.2.2D'])
row(SE, 'Morphology: Silent e with suffixes', 'raked, hiking', '', 'Dropping rule: when adding a vowel suffix to a silent e word, drop the e before adding the suffix.', ['suffixes', 'spelling rules'], ['RF.2.3E', 'L.2.2D'])

VT = 'Vowel Teams'
row(VT, 'Contractions', "can't, don't, won't, doesn't", '', 'Two words combined and shortened to make one word, joined with an apostrophe.', ['contractions'], ['L.2.2C'])
row(VT, 'Long a: ai, ay', 'rain, stay', 'play, day, say, way, wait, says, said, they, their', 'ai is found at the beginning or middle; ay is at the end. Vowel teams are two or more letters that together represent a vowel sound.', ['long a ai ay'], ['RF.1.3C', 'RF.2.3C'])
row(VT, 'Long e: ee, ea', 'need, seat', 'green, sleep, three, need, keep, feel, feet, week, real, read, please, near, means, year, leave, eat, each', 'ea and ee can be found at the beginning, middle or end, most commonly in the middle.', ['long e ee ea'], ['RF.1.3C', 'RF.2.3C'])
row(VT, 'Morphology: Suffix -y', 'windy, sunny', '', '-y is added to nouns to make adjectives.', ['suffixes'], ['RF.2.3E', 'L.2.4C'])
row(VT, 'Long o: oa, ow, oe', 'boat, slow, toe', 'grow, show, goes, own, know; irregular: though', 'oa is found at the beginning or middle; ow at the end (except shown, grown, own); oe at the end of a few words.', ['long o oa ow'], ['RF.1.3C', 'RF.2.3C'])
row(VT, 'Long i: igh, ie', 'light, pie', 'high, might, light, right, night; irregular: eye, buy', 'igh is usually in the middle followed by t, and at the end of a few words (high, thigh, sigh). ie is found at the end of a few words (pie, tie, lie, die).', ['long i igh y'], ['RF.1.3C', 'RF.2.3C'])
row(VT, 'Morphology: -ful, -less, -ly, -ness', 'helpful, useless, quickly, quickness', '', '-ful and -less make adjectives; -ly usually makes adverbs; -ness makes nouns.', ['suffixes'], ['RF.2.3E', 'L.2.4C'])
row(VT, 'Long e: ie; other sounds of ea', 'field; bread, great', '', '', ['long e ee ea'], ['RF.2.3C', 'RF.2.3F'])
row(VT, 'Morphology: Prefixes re-, un-', 'reread, unpaid', '', 're- means again or back; un- means not or the opposite of.', ['prefixes'], ['RF.2.3E', 'L.2.4B'])

SL = 'Silent Letters'
row(SL, 'Digraphs: kn, wr', 'knot, wrist', 'know, knew, write, wrote', 'kn and wr are digraphs with a silent letter; long ago they were blends. Words with kn often relate to sharp points, and wr to bending or twisting.', ['silent letters'], ['RF.2.3F'])

RC = 'R-Controlled'
r_note = 'When a vowel is in front of r, it does not represent one of its usual sounds; it makes a new sound with the r.'
row(RC, '<ar>', 'star, card', 'start, part, hard, are', r_note, ['r-controlled vowels'], ['RF.1.3B', 'RF.2.3F'])
row(RC, '<or>', 'corn, storm', 'for, or, your, four', r_note, ['r-controlled vowels'], ['RF.1.3B', 'RF.2.3F'])
row(RC, '<ir>, <er>, <ur> = /er/', 'bird, curb, fern', 'first, her, turn, girl, were', 'The /er/ sound is usually spelled er, ir or ur.', ['r-controlled vowels'], ['RF.1.3B', 'RF.2.3F'])
row(RC, 'Morphology: Suffixes -er and -est', '', '', '-er has two meanings: more than, and a person who. -est means most.', ['suffixes'], ['RF.2.3E', 'L.2.4C'])
row(RC, 'war, wor', 'warm, work', 'warm, world, work, word', 'The letter w often warps the sound of the following vowel: war spells /wor/ and wor spells /wer/.', ['r-controlled vowels'], ['RF.2.3F'])
row(RC, 'Morphology: Suffix -en', '', '', '', ['suffixes'], ['RF.2.3E', 'L.2.4C'])

OV = 'Other Vowels'
row(OV, '/ū/: oo', 'moon, boot', 'too, soon', 'There are two long u sounds, /ū/ and /yū/. /ū/ can be spelled oo, ew (usually at the end), ue (usually at the end) and ui (the rarest).', ['vowel teams'], ['RF.2.3C'])
row(OV, '/ū/ and /yū/: ew, ui, ue', 'stew, fruit, glue', 'new, few, blue', '/yū/ is usually spelled ue or ew.', ['vowel teams'], ['RF.2.3C'])
row(OV, 'Short /oo/ (as in book)', 'book, stood', 'good, look; irregular: could, would, should', 'The letters oo can also represent the short /oo/ sound.', ['vowel teams'], ['RF.2.3C', 'RF.2.3F'])
row(OV, '/ou/ = <ou> and <ow>', 'house, cow', 'how, now, down, brown, out, our, round, found', 'ou: beginning or middle of a word. ow: at the end, or in the beginning or middle if followed by a single l or n.', ['diphthongs'], ['RF.2.3C'])
row(OV, 'Morphology: Prefixes pre- and mis-', 'misread, precook', '', 'pre- means before; mis- means wrong.', ['prefixes'], ['RF.2.3E', 'L.2.4B'])
row(OV, '/oi/: <oy> and <oi>', 'toy, spoil', 'boy', 'oi is found at the beginning or middle; oy at the end.', ['diphthongs'], ['RF.2.3C'])
row(OV, '<aw> and <au>', 'paw, sauce', 'saw, draw, cause, laugh, talk, caught, walk, bought, thought', 'au: beginning or middle of a word; aw: at the end, or in the beginning or middle if followed by a single l, n or k.', ['vowel teams'], ['RF.2.3C', 'RF.2.3F'])

MM = 'Multisyllable & Morphology'
row(MM, 'Morphology: Suffix -able', 'moveable, usable', '', 'Creates adjectives; means capable of.', ['suffixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, 'Digraphs & ghost sounds: ph, gn, mb', 'phone, gnaw, thumb', '', '', ['silent letters'], ['RF.2.3F', 'RF.3.3C'])
row(MM, 'Compound Words', 'sunset, sandbox', '', 'A word made up of two smaller words.', ['compound words'], ['L.2.4D'])
row(MM, 'VCCV Words (closed-closed)', 'bas-ket, rab-bit', 'until, often; <al> words: almost', 'When you see the pattern VCCV, usually divide the word between the two consonants. The first vowel will be short.', ['syllables', 'syllable division'], ['RF.1.3E', 'RF.2.3D', 'RF.3.3C'])
row(MM, 'The Schwa', 'bacon, data, nickel', '', 'The schwa is the most common vowel sound. Every vowel can represent it. It is a lazy /ŭ/ or /ĭ/ sound.', ['schwa'], ['RF.3.3C'])
row(MM, 'Y spells /ē/ & review Suffix -y', 'funny, bumpy', 'only, carry, funny, pretty', 'At the end of multi-syllable words, y says /ē/.', ['long e y', 'suffixes'], ['RF.2.3C', 'RF.2.3E'])
row(MM, 'VCCCV Syllable Division Rule (closed-closed)', 'conflict, pumpkin', '', 'Usually divide after the first consonant, unless you need to keep digraphs and blends together, as in pump-kin.', ['syllable division'], ['RF.3.3C'])
row(MM, 'VCV Words (V-CV and VC-V)', 'ro-bot, clos-et', 'even, open, seven, very, any, many, ago, along', 'Sometimes divide after the first vowel, which makes it long; other times after the consonant, which makes it short.', ['syllable division', 'open syllables'], ['RF.2.3D', 'RF.3.3C'])
row(MM, 'Soft c and Soft G', 'city, gem, pencil', '', 'c spells /s/ and g spells /j/ when e, i or y follows.', ['soft c and g'], ['RF.2.3F', 'RF.3.3C'])
row(MM, 'Consonant -le', 'tur-tle, ta-ble, pud-dle', 'little, people', 'A syllable type that is always at the end of the word, the only one where you do not hear a distinct vowel sound. Divide right before the consonant.', ['syllables', 'syllable division'], ['RF.3.3C'])
row(MM, '2-Syllable Words with silent e', 'explore, define', 'sentence, before, above', '', ['long a vce', 'syllable division'], ['RF.2.3D'])
row(MM, 'Morphology: Suffix -ive and -ion', 'active, detective, action, location', '', '-ive means doing or being and makes adjectives. -ion means action or process of and forms abstract nouns; with t it makes the final stable syllable tion, /shun/.', ['suffixes'], ['RF.3.3A', 'RF.3.3B', 'L.3.4B'])
row(MM, 'Morphology: Suffix -ure, -age', 'picture, structure, package, storage', '', '-ure forms nouns; ture is pronounced /cher/ at the end of multi-syllable words. -age is pronounced /ij/ and forms nouns.', ['suffixes'], ['RF.3.3A', 'RF.3.3B'])
row(MM, '2-Syllable Words with Bossy r', 'marker, birthday, corner', 'number, under, after, better, never, ever, over, sister, other, mother, brother', '', ['r-controlled vowels', 'syllable division'], ['RF.3.3C'])
row(MM, 'Morphology: Prefix ex-', 'export, extend', '', 'ex- is a prefix meaning out.', ['prefixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, '2-Syllable Words with long Vowel Teams', 'complain, window, eagle', 'between, follow, ready, away, again, ahead', '', ['vowel teams', 'syllable division'], ['RF.2.3D', 'RF.3.3C'])
row(MM, 'Prefixes con, com, in, im', '', '', 'in/im: in, on, not. con/com/col: together, with, thorough.', ['prefixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, '2-Syllable Words with Vowel Teams (ou, ow, oo, ue, ew, oi, oy, aw)', 'about, flower', 'because, around, about, enough', '', ['vowel teams', 'diphthongs', 'syllable division'], ['RF.3.3C'])
row(MM, 'Suffix -ment', 'treatment', '', 'Result of, product of.', ['suffixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, 'Prefixes de, dis', 'dislike, defend', '', 'dis: opposite of, not, remove. de: off, down, from.', ['prefixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, 'Suffix: ible', '', '', '', ['suffixes'], ['RF.3.3B', 'L.3.4B'])
row(MM, 'Prefix sub-, trans-', '', '', '', ['prefixes'], ['RF.3.3A', 'L.3.4B'])
row(MM, 'Suffix -al/-ial (final stable cial, tial)', 'dismissal, facial, spatial', '', '', ['suffixes'], ['RF.3.3B', 'L.3.4B'])

EARLY = {AK, CS}

def hfw_code(section):
    return ['RF.K.3C', 'RF.1.3G'] if section in EARLY else ['RF.2.3G']

def units():
    out = []
    for r in S:
        lessons = []
        ex = f" ({r['examples']})" if r['examples'] else ''
        lessons.append({'title': 'Teach the pattern', 'objective': f"Students will read and spell words with the pattern {r['pattern']}{ex}.", 'notes': '', 'codes': r['codes'], 'tags': r['tags']})
        if r['hfw']:
            lessons.append({'title': f"High-frequency words: {r['hfw']}", 'objective': f"Students will read and spell the high-frequency words {r['hfw']} by sight.", 'notes': '', 'codes': hfw_code(r['section']), 'tags': ['sight words']})
        codes = []
        for l in lessons:
            for c in l['codes']:
                if c not in codes:
                    codes.append(c)
        tags = list(dict.fromkeys(r['tags'] + (['sight words'] if r['hfw'] else [])))
        out.append({'title': f"{r['section']} · {r['pattern']}", 'weeks': 1, 'summary': r['notes'] or f"{r['section']}.", 'tags': tags, 'codes': codes, 'lessons': lessons})
    return out

def emit_paste(us):
    lines = []
    for u in us:
        lines.append(f"Unit: {u['title']} | weeks: {u['weeks']} | summary: {u['summary']} | skills: {', '.join(u['tags'])} | ccss: {', '.join(u['codes'])}")
        for l in u['lessons']:
            cc = f" | ccss: {', '.join(l['codes'])}" if l['codes'] else ''
            lines.append(f"- {l['title']} | {l['objective']}{cc} | skills: {', '.join(l['tags'])}")
    return '\n'.join(lines) + '\n'

def q(text):
    return f'$q${text}$q$' if text else "''"

def arr(items):
    return 'ARRAY[' + ', '.join(q(x) for x in items) + ']::text[]' if items else "'{}'::text[]"

def emit_sql(us):
    tags = []
    for u in us:
        for t in u['tags'] + [t for l in u['lessons'] for t in l['tags']]:
            if t not in tags:
                tags.append(t)
    out = ["-- Science of Reading, Systematic Phonics: the full sequence as units for the Bookshelf.",
           "-- Run once in the Supabase SQL Editor after migration-curriculum-catalogue.sql. Safe to re-run: a book that",
           "-- already has units is left alone. To reload: DELETE FROM curriculum_units WHERE book_id = (SELECT b.id FROM curriculum_books b JOIN curriculum_series s ON s.id = b.series_id WHERE lower(s.name) = 'science of reading');",
           "",
           "CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_books_series_level ON curriculum_books (series_id, lower(level_number));",
           "INSERT INTO curriculum_series (name, strand, color, sort_order) VALUES ('Science of Reading', 'phonics', 'teal', 15) ON CONFLICT (lower(name)) DO NOTHING;",
           "INSERT INTO curriculum_skills (code, label, strand, sort_order) SELECT t, initcap(t), 'phonics', 100 FROM unnest(" + arr(tags) + ") AS t ON CONFLICT (code) DO NOTHING;",
           "",
           f"-- ── {len(us)} patterns, {sum(len(u['lessons']) for u in us)} lessons ──",
           "DO $seed$", "DECLARE b UUID; u UUID; n INT;", "BEGIN",
           "  INSERT INTO curriculum_books (series_id, level_number, title, status) SELECT id, '', 'Systematic Phonics', 'confirmed' FROM curriculum_series WHERE lower(name) = 'science of reading' ON CONFLICT (series_id, lower(level_number)) DO NOTHING;",
           "  SELECT bk.id INTO b FROM curriculum_books bk JOIN curriculum_series s ON s.id = bk.series_id WHERE lower(s.name) = 'science of reading' AND bk.level_number = '';",
           "  SELECT count(*) INTO n FROM curriculum_units WHERE book_id = b;",
           "  IF n > 0 THEN RAISE NOTICE 'Science of Reading already has % units; left as it is', n; RETURN; END IF;"]
    for i, u in enumerate(us, 1):
        out.append(f"  INSERT INTO curriculum_units (book_id, sort_order, title, summary, skill_tags, ccss_codes, default_weeks, source) VALUES (b, {i}, {q(u['title'])}, {q(u['summary'])}, {arr(u['tags'])}, {arr(u['codes'])}, {u['weeks']}, 'claude') RETURNING id INTO u;")
        for j, l in enumerate(u['lessons'], 1):
            out.append(f"  INSERT INTO curriculum_lessons (unit_id, sort_order, title, objective, notes, ccss_codes, skill_tags, source) VALUES (u, {j}, {q(l['title'])}, {q(l['objective'])}, {q(l['notes'])}, {arr(l['codes'])}, {arr(l['tags'])}, 'claude');")
    out += [f"  RAISE NOTICE 'Science of Reading: {len(us)} units loaded';", "END $seed$;", ""]
    return '\n'.join(out)

if __name__ == '__main__':
    us = units()
    json.dump(S, open(os.path.join(HERE, 'sequence.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(ROOT, 'docs', 'catalogue', 'science-of-reading.txt'), 'w', encoding='utf-8').write(emit_paste(us))
    open(os.path.join(ROOT, 'supabase', 'seed-science-of-reading.sql'), 'w', encoding='utf-8').write(emit_sql(us))
    print(f"{len(us)} patterns, {sum(len(u['lessons']) for u in us)} lessons; sections: {sorted(set(r['section'] for r in S), key=lambda x: [r['section'] for r in S].index(x))}")
