#!/usr/bin/env node
// Pulls an eSmart Campus ebook (e-future's Toast viewer) out as files we can build lessons from:
// every page image, every hotspot/data file the viewer loads, and the audio clips those files name.
//
// It does not need to know the URL pattern in advance. It drives a real Chromium window through the
// book page by page and saves everything the viewer fetches. The first run also prints the pattern
// it found, so later books can be checked at a glance.
//
//   node fetch-ebook.mjs --book HIH2nd_S            # Hand in Hand 2nd ed. Starter, 184 pages
//   node fetch-ebook.mjs --book HIH2nd_1 --zoom     # also zoom each spread to force high-res images
//
// Options
//   --book <id>            folder name in the ebook URL (https://esmartcampus.co.kr/ebook/<id>/index.jsp)
//   --url <url>            full viewer URL, if a book lives somewhere else
//   --out <dir>            output root (default: ./out). Files land in <out>/<book>/
//   --zoom                 zoom in on every spread so the viewer fetches its large images too
//   --headless             no window (only useful once the profile is already logged in)
//   --login-timeout <sec>  how long to wait for you to log in (default 600)
//   --flip-wait <ms>       pause after each page turn (default 1200)
//
// The login is kept in ./profile between runs, so you log in once for all seven levels.
// Output is licensed content: out/ and profile/ are git-ignored on purpose. Keep it that way.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
const book = args.book || 'HIH2nd_S';
const ORIGIN = 'https://esmartcampus.co.kr';
const bookBase = `${ORIGIN}/ebook/${book}/`;
const startUrl = args.url || `${bookBase}index.jsp`;
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, args.out || 'out', book);
const rawDir = path.join(outDir, 'raw');
const profileDir = path.resolve(here, 'profile');
const loginTimeoutMs = Number(args['login-timeout'] || 600) * 1000;
const flipWaitMs = Number(args['flip-wait'] || 1200);
const MIN_IMAGE_BYTES = 20 * 1024; // anything smaller is toolbar chrome, not a page
const MAX_FLIPS = 600;

const saved = new Map(); // relative file -> { url, type, bytes, width, height }
const counts = { images: 0, audio: 0, data: 0, other: 0 };
const pendingWrites = new Set();

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});

async function main() {
  await fs.mkdir(rawDir, { recursive: true });
  console.log(`Book:    ${book}`);
  console.log(`Viewer:  ${startUrl}`);
  console.log(`Output:  ${outDir}\n`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: Boolean(args.headless),
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    downloadsPath: outDir,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  context.on('response', onResponse);
  context.on('page', (p) => p.on('download', onDownload));
  for (const p of context.pages()) p.on('download', onDownload);

  let page = context.pages()[0] || (await context.newPage());
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

  page = await waitForViewer(context, page);
  console.log(`\n✓ Viewer open: ${page.url()}`);

  await flipThroughBook(page);
  await settle();
  await fetchNamedAudio(context);
  await settle();
  await writeManifest();
  report();

  await context.close();
  process.exit(0); // the Enter listener on stdin would otherwise keep Node alive
}

// ---------- capture ----------

async function onResponse(res) {
  try {
    const url = res.url();
    if (!url.startsWith(ORIGIN + '/')) return;
    if (res.status() !== 200) return;
    const ct = (res.headers()['content-type'] || '').toLowerCase();
    const clean = url.split(/[?#]/)[0];
    const ext = path.extname(clean).toLowerCase();
    let type = null;
    if (ct.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/.test(ext)) type = 'images';
    else if (ct.startsWith('audio/') || ct.startsWith('video/') || /\.(mp3|m4a|ogg|wav|mp4)$/.test(ext)) type = 'audio';
    else if (/json|xml|text\/plain/.test(ct) && !/\.(js|css|html?|jsp)$/.test(ext)) type = 'data';
    else if (/\.(json|xml|txt|csv|pdf)$/.test(ext)) type = ext === '.pdf' ? 'other' : 'data';
    if (!type) return;

    const rel = urlToRelPath(clean);
    if (saved.has(rel)) return;
    saved.set(rel, { url: clean, type, bytes: 0 });

    const p = (async () => {
      const body = await res.body();
      if (type === 'images' && body.length < MIN_IMAGE_BYTES) {
        saved.delete(rel);
        return;
      }
      const entry = saved.get(rel);
      entry.bytes = body.length;
      if (type === 'images') Object.assign(entry, imageSize(body));
      const file = path.join(rawDir, rel);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      counts[type]++;
    })().catch(() => saved.delete(rel)); // body gone after navigation; harmless
    pendingWrites.add(p);
    p.finally(() => pendingWrites.delete(p));
  } catch {
    /* ignore */
  }
}

async function onDownload(download) {
  const name = download.suggestedFilename() || 'download.bin';
  const file = path.join(outDir, name);
  await download.saveAs(file);
  console.log(`  ↓ saved download ${name}`);
}

function settle() {
  return Promise.allSettled([...pendingWrites]);
}

// ---------- login and viewer detection ----------

async function waitForViewer(context, page) {
  const deadline = Date.now() + loginTimeoutMs;
  let told = false;
  let enterPressed = false;
  const enter = waitForEnter().then(() => (enterPressed = true));

  while (Date.now() < deadline) {
    const viewer = await findViewerPage(context);
    if (viewer) return viewer;

    if (!told) {
      told = true;
      console.log('The site wants a login.');
      console.log('  1. Log in to eSmart Campus in the Chromium window that just opened.');
      console.log('  2. Open the book there, OR come back here and press Enter and I will open it.');
      console.log(`     (${startUrl})`);
    }
    if (enterPressed) {
      enterPressed = false;
      const target = context.pages()[0] || page;
      await target.goto(startUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await target.waitForTimeout(2500);
      const again = await findViewerPage(context);
      if (again) return again;
      console.log('  Still not logged in. Log in in the window, then press Enter again.');
    }
    await page.waitForTimeout(1500).catch(() => {});
  }
  enter.catch(() => {});
  throw new Error('Timed out waiting for the viewer. Log in in the Chromium window, then run again.');
}

async function findViewerPage(context) {
  for (const p of context.pages()) {
    if (!p.url().startsWith(bookBase)) continue;
    for (const frame of p.frames()) {
      const ready = await frame
        .evaluate(() => {
          const bigImg = [...document.images].some((i) => i.naturalWidth > 500);
          const canvas = document.querySelector('canvas');
          const counter = document.body && /\b\d+\s*\/\s*\d+\b/.test(document.body.innerText || '');
          return Boolean(bigImg || canvas || counter);
        })
        .catch(() => false);
      if (ready) return p;
    }
  }
  return null;
}

function waitForEnter() {
  if (!process.stdin.isTTY) return new Promise(() => {});
  const rl = readline.createInterface({ input: process.stdin });
  return new Promise((resolve) => rl.once('line', () => resolve()));
}

// ---------- page turning ----------

// The "4 / 184" counter: plain text in one element, or a page-number <input> next to "/ 184".
async function readCounter(page) {
  for (const frame of page.frames()) {
    const found = await frame
      .evaluate(() => {
        const re = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
        for (const el of document.querySelectorAll('body *')) {
          if (el.children.length > 3) continue;
          const m = re.exec(el.textContent || '');
          if (m) return { current: Number(m[1]), total: Number(m[2]) };
        }
        for (const input of document.querySelectorAll('input')) {
          if (!/^\d+$/.test(input.value || '')) continue;
          const around = (input.parentElement && input.parentElement.textContent) || '';
          const m = /\/\s*(\d+)/.exec(around);
          if (m) return { current: Number(input.value), total: Number(m[1]) };
        }
        return null;
      })
      .catch(() => null);
    if (found) return found;
  }
  return null;
}

async function command(page, name, fallbackKey) {
  const selectors = [
    `[data-command="${name}"]`,
    `[data-cmd="${name}"]`,
    `[data-action="${name}"]`,
    `.${name}`,
    `.btn-${name}`,
    `.tt-${name}`,
    `[class*="${name}"]`,
  ];
  for (const frame of page.frames()) {
    for (const sel of selectors) {
      const el = frame.locator(sel).first();
      if ((await el.count().catch(() => 0)) && (await el.isVisible().catch(() => false))) {
        await el.click({ timeout: 2000 }).catch(() => {});
        return `click ${sel}`;
      }
    }
  }
  if (fallbackKey) {
    await page.keyboard.press(fallbackKey).catch(() => {});
    return `key ${fallbackKey}`;
  }
  return null;
}

async function flipThroughBook(page) {
  await page.bringToFront();
  await page.mouse.click(800, 500).catch(() => {}); // focus the viewer for keyboard turns
  await command(page, 'firstPage', 'Home');
  await page.waitForTimeout(flipWaitMs);

  let counter = await readCounter(page);
  if (counter) console.log(`  Page counter found: ${counter.current} / ${counter.total}`);
  else console.log('  No page counter found; will stop when page turns stop loading new images.');

  let lastImages = counts.images;
  let idleFlips = 0;
  let how = null;
  let edgeClicks = false; // last resort: the big arrow on the right edge of the viewer
  const view = page.viewportSize() || { width: 1600, height: 1000 };
  for (let flip = 0; flip < MAX_FLIPS; flip++) {
    if (args.zoom) await zoomSpread(page);

    if (edgeClicks) {
      await page.mouse.click(view.width - 22, Math.round(view.height / 2)).catch(() => {});
      how = 'click right edge';
    } else {
      how = await command(page, 'nextPage', 'ArrowRight');
    }
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(flipWaitMs);

    const now = await readCounter(page);
    process.stdout.write(
      `\r  turned ${flip + 1} times, ${counts.images} images, ${counts.data} data, ${counts.audio} audio` +
        (now ? `  (page ${now.current}/${now.total})` : '') +
        '   ',
    );
    if (now && now.total && now.current >= now.total) break;
    const pageMoved = now && counter ? now.current !== counter.current : counts.images !== lastImages;
    if (counts.images === lastImages && !pageMoved) idleFlips++;
    else idleFlips = 0;
    lastImages = counts.images;
    if (idleFlips >= 3 && !edgeClicks) {
      edgeClicks = true; // the first way of turning pages did nothing; try the on-screen arrow
      idleFlips = 0;
      console.log('\n  Keyboard and buttons did not turn the page; trying the arrow on the right edge.');
    } else if (idleFlips >= 3) {
      break; // nothing turns the page any more: the book is at its end
    }
    counter = now || counter;
  }
  console.log(`\n  Page turning done (${how || 'keyboard'}).`);
}

async function zoomSpread(page) {
  await command(page, 'zoomIn', null);
  await page.waitForTimeout(600);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await command(page, 'zoomOut', null);
  await page.waitForTimeout(300);
}

// ---------- audio named in the data files ----------

async function fetchNamedAudio(context) {
  const dataFiles = [...saved.entries()].filter(([, v]) => v.type === 'data');
  if (!dataFiles.length) {
    console.log('  No data files were loaded, so no audio list to follow. Audio must be captured by clicking hotspots.');
    return;
  }
  const urls = new Set();
  for (const [rel, v] of dataFiles) {
    const text = await fs.readFile(path.join(rawDir, rel), 'utf8').catch(() => '');
    for (const m of text.matchAll(/[\w\-./%]+\.(?:mp3|m4a|ogg|wav|mp4)\b/gi)) {
      const ref = m[0].replace(/^\.\//, '');
      const dirOfData = v.url.slice(0, v.url.lastIndexOf('/') + 1);
      for (const base of [dirOfData, bookBase, ORIGIN + '/']) {
        urls.add(ref.startsWith('/') ? ORIGIN + ref : base + ref);
      }
    }
  }
  if (!urls.size) {
    console.log('  Data files do not name any audio. Audio must be captured by clicking hotspots.');
    return;
  }
  console.log(`  Fetching ${urls.size} audio candidates named in the data files…`);
  let ok = 0;
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const rel = urlToRelPath(url);
      if (saved.has(rel)) continue;
      const res = await context.request.get(url).catch(() => null);
      if (!res || res.status() !== 200) continue;
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (!/audio|video|octet-stream/.test(ct)) continue;
      const body = await res.body();
      const file = path.join(rawDir, rel);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      saved.set(rel, { url, type: 'audio', bytes: body.length });
      counts.audio++;
      ok++;
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`  Audio saved: ${ok}`);
}

// ---------- manifest and report ----------

async function writeManifest() {
  const entries = [...saved.entries()]
    .map(([file, v]) => ({ file, ...v }))
    .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ book, startUrl, fetchedAt: new Date().toISOString(), entries }, null, 2));
}

function report() {
  const images = [...saved.entries()].filter(([, v]) => v.type === 'images');
  console.log(`\nSaved to ${outDir}`);
  console.log(`  images ${counts.images}   data ${counts.data}   audio ${counts.audio}`);
  if (!images.length) {
    console.log('  No page images were captured. The viewer may draw pages from an encoded source; tell Claude what the manifest shows.');
    return;
  }
  const byDir = new Map();
  for (const [rel, v] of images) {
    const dir = path.dirname(rel);
    const d = byDir.get(dir) || { n: 0, example: rel, maxW: 0 };
    d.n++;
    d.maxW = Math.max(d.maxW, v.width || 0);
    byDir.set(dir, d);
  }
  console.log('  Image folders found:');
  for (const [dir, d] of [...byDir.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`    ${dir}/  ${d.n} files, widest ${d.maxW || '?'}px   e.g. ${path.basename(d.example)}`);
  }
  const widest = Math.max(...images.map(([, v]) => v.width || 0));
  if (widest && widest < 1400 && !args.zoom) {
    console.log('  Pages are smallish. Run again with --zoom to make the viewer fetch its large images.');
  }
  console.log('  Full list: manifest.json');
}

// ---------- helpers ----------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}

function urlToRelPath(url) {
  let p = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : url;
  p = p.split(/[?#]/)[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep as is */
  }
  const prefix = `/ebook/${book}/`;
  if (p.startsWith(prefix)) p = p.slice(prefix.length);
  p = p.replace(/^\/+/, '').replace(/\.\./g, '_');
  return p || 'index';
}

// Width and height of a JPEG, PNG, GIF or WebP from its header bytes. Enough to judge resolution.
function imageSize(buf) {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf[0] === 0x47 && buf[1] === 0x49) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return {};
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
  } catch {
    /* not an image we can read */
  }
  return {};
}
