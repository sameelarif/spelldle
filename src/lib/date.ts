/** First local-calendar puzzle day in the seed. Challenge day 1. */
export const PUZZLE_EPOCH = '2026-11-10'

/** Player's local calendar date as YYYY-MM-DD. */
export function localDateISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function utcMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** 1-based index: epoch is day 1, then +1 each local calendar day. */
export function challengeDay(iso: string, epoch = PUZZLE_EPOCH): number {
  return Math.round((utcMidnight(iso) - utcMidnight(epoch)) / 86_400_000) + 1
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function tomorrowName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + 1)
  return date.toLocaleDateString(undefined, { weekday: 'long' })
}
