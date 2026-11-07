import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import { plainName } from '@/components/curriculum/standards-plain'

// ─── A CCSS code in words ────────────────────────────────────────
// For hovers wherever a code is shown: the plain teacher-facing name and the
// official text. Book data writes sub-letters in capitals ("RF.1.3C") and the
// standards list in lower case ("RF.1.3c"), so codes match either way.

const BY_CODE = new Map(CCSS_STANDARDS.map(s => [s.code.toLowerCase(), s]))

export interface StandardInfo { code: string; plain: string; text: string; cluster: string }

export function standardInfo(raw: string): StandardInfo {
  const s = BY_CODE.get((raw || '').trim().toLowerCase())
  const code = s?.code || (raw || '').trim()
  const plain = plainName(code)
  return { code, plain: plain !== code ? plain : '', text: s?.text || '', cluster: s?.cluster || '' }
}

/** One line for a native hover: the code, its plain name and the official text. */
export function standardTitle(raw: string): string {
  const i = standardInfo(raw)
  return [i.code, i.plain, i.text].filter(Boolean).join(': ')
}
