// ─── One colour and one short name per domain ────────────────────
// Used wherever a standard, column or heading needs to say which gradebook
// it belongs to without the reader decoding the CCSS prefix: pink L.4.3 is
// Language on every screen.

export const DOMAIN_COLOR: Record<string, string> = { reading: '#3B82F6', phonics: '#8B5CF6', writing: '#F59E0B', speaking: '#22C55E', language: '#EC4899' }
export const DOMAIN_SHORT: Record<string, string> = { reading: 'R', phonics: 'PF', writing: 'W', speaking: 'SL', language: 'L' }

export const domainColor = (d: string | undefined | null) => (d && DOMAIN_COLOR[d]) || '#64748B'
export const domainShort = (d: string | undefined | null) => (d && DOMAIN_SHORT[d]) || (d || '').slice(0, 2).toUpperCase()
/** A faint wash of the domain colour for row and column tints. */
export const domainTint = (d: string | undefined | null, alpha = '14') => `${domainColor(d)}${alpha}`
