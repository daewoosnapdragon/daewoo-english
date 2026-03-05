/**
 * Shared upload utilities.
 * Extracted from UploadOrganize.tsx / UploadDropzone.tsx to eliminate duplication.
 */

/**
 * Compute truncated SHA-256 hash of a File.
 * Returns 32 hex characters (128 bits) — consistent with server-side hashing.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * Get page count from a PDF file using pdf.js.
 * Uses pdfjs-dist npm package (add with: npm install pdfjs-dist)
 * Falls back to CDN if npm package not available.
 */
let pdfjsLib: any = null;

async function ensurePdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;

  // Try npm import first (dynamic to avoid webpack resolution)
  try {
    const pdfjsModule = 'pdfjs-dist';
    const pdfjs = await import(/* webpackIgnore: true */ pdfjsModule);
    // Set worker source for npm version
    const workerPath = 'pdfjs-dist/build/pdf.worker.min.mjs';
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch {
    // pdfjs-dist not installed — fall back to CDN
  }

  // CDN fallback
  if (!(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load pdf.js'));
      document.head.appendChild(s);
    });
  }
  pdfjsLib = (window as any).pdfjsLib;
  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return pdfjsLib;
}

export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const pdfjs = await ensurePdfJs();
    if (!pdfjs) return 1;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const count = pdf.numPages || 1;
    pdf.destroy();
    return count;
  } catch {
    return 1;
  }
}

/**
 * Check if a file is a duplicate by hash.
 * Returns the existing resource if found, null otherwise.
 */
export async function checkDuplicate(hash: string): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(`/api/resources?file_hash=${hash}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0];
    return null;
  } catch {
    return null;
  }
}
