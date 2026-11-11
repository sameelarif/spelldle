import { challengeDay } from './date'
import { totalScore } from './score'
import type { WordResult } from './types'

const CELLS = 5
const CELL = 100 / CELLS

/** Five squares: 🟩 per 20 points, 🟨 for a leftover 10+, ⬛ empty. */
export function scoreRow(score: number, perfect: boolean): string {
  if (perfect || score >= 100) return '🟩🟩🟩🟩🟩'
  const full = Math.min(CELLS, Math.floor(Math.max(0, score) / CELL))
  const rem = Math.max(0, score) - full * CELL
  const cells: string[] = []
  for (let i = 0; i < CELLS; i++) {
    if (i < full) cells.push('🟩')
    else if (i === full && rem >= CELL / 2) cells.push('🟨')
    else cells.push('⬛')
  }
  return cells.join('')
}

export function shareText(
  date: string,
  results: Array<WordResult | null>,
  streak: number,
): string {
  const rows = results.map((item) => scoreRow(item?.score ?? 0, Boolean(item?.perfect)))
  const total = totalScore(results)
  const tail = streak > 0 ? `${total}/300 · 🔥${streak}` : `${total}/300`
  return [`🐝 Spelldle #${challengeDay(date)}`, ...rows, tail].join('\n')
}
