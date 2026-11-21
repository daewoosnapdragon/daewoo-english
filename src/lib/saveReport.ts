// When a save covering many students writes some and not others, a count
// ("Saved with 2 errors") leaves the teacher hunting for whose. These name
// them instead: English names, up to five, then "and N more".

export function nameList(names: string[], ko: boolean, max = 5): string {
  const shown = names.slice(0, max)
  const more = names.length - shown.length
  if (ko) return shown.join(', ') + (more > 0 ? ` 외 ${more}명` : '')
  if (more > 0) return `${shown.join(', ')} and ${more} more`
  if (shown.length <= 1) return shown[0] || ''
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
}

/** 을 after a final consonant, 를 after a vowel; 을(를) when the word does not end in Hangul. */
export function objectParticle(word: string): string {
  const c = word.trim().slice(-1).charCodeAt(0)
  if (!(c >= 0xac00 && c <= 0xd7a3)) return '을(를)'
  return (c - 0xac00) % 28 ? '을' : '를'
}

/**
 * The toast for a save that failed for these students. What they entered is
 * still on the screen, so the message says so; the caller adds a Retry.
 * `what` names the thing in the plural ("scores", "comments").
 */
export function notSavedMessage(names: string[], ko: boolean, what: { en: string; ko: string } = { en: 'scores', ko: '점수' }): string {
  if (names.length === 0) return ko ? `${what.ko}${objectParticle(what.ko)} 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.` : `Could not save the ${what.en}. What you entered is still here.`
  return ko
    ? `${nameList(names, true)}의 ${what.ko}${objectParticle(what.ko)} 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.`
    : `Could not save ${what.en} for ${nameList(names, false)}. What you entered is still here.`
}

export const retryLabel = (ko: boolean) => (ko ? '다시 시도' : 'Retry')
