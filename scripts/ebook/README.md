# Ebook fetch

Pulls a Hand in Hand ebook out of eSmart Campus as files: one image per page, the hotspot
data the viewer loads, and the audio clips it names. These feed the lesson materials we build
for our own classes. e-future has agreed to internal use; the files stay on school machines and
never go into this repository (`out/` and `profile/` are git-ignored).

## One-time setup

```bash
cd scripts/ebook
npm run setup
```

That installs Playwright and a private copy of Chromium. Nothing touches the main app.

## Fetch a book

```bash
cd scripts/ebook
node fetch-ebook.mjs --book HIH2nd_S
```

A Chromium window opens on the viewer. The first time it will bounce to the eSmart Campus
login. Log in there, then either open the book in that window or press Enter in the terminal
and the script opens it. The login is remembered in `profile/`, so the other six levels need
no login.

The script then turns every page, saves everything the viewer fetches, follows any audio file
names it finds in the data files, and prints where the page images live and how large they are.
Expect a few minutes per book.

Results land in `out/<book>/`:

- `raw/` mirrors the viewer's own folder structure, so page images keep their original names.
- `manifest.json` lists every file with its source URL, size, and image dimensions.

## If the pages look small

Flipbook viewers often show a medium image and only fetch the large one when you zoom. Run
again with `--zoom`; the script zooms into each spread so the large images get fetched too.

## Book ids

The id is the folder in the viewer URL: `https://esmartcampus.co.kr/ebook/<id>/index.jsp`.
Starter is `HIH2nd_S`. Open each level from your eSmart Campus book list once and copy the id
from the address bar. Workbooks have their own ids.

## Try the download button first

The Toast viewer has a PDF Download command. If the download icon in the viewer's toolbar
offers the whole book as a PDF, take it: the script is only needed for the audio and hotspot
data, and `pdftoppm` turns the PDF into page images. Any file you download inside the script's
Chromium window is saved to `out/<book>/` as well.
