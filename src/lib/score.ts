function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, '')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

export function scoreGuess(guess: string, answer: string) {
  const g = normalize(guess)
  const t = normalize(answer)
  if (g.length === 0) {
    return { distance: t.length, score: 0, perfect: false, normalized: g }
  }
  const distance = levenshtein(g, t)
  if (distance === 0) {
    return { distance: 0, score: 100, perfect: true, normalized: g }
  }
  const denom = Math.max(t.length, g.length)
  const score = Math.max(0, Math.round(100 * (1 - distance / denom)))
  return { distance, score, perfect: false, normalized: g }
}

export function closenessLabel(score: number, perfect: boolean): string {
  if (perfect) return 'Exact.'
  if (score >= 90) return 'So close it stings.'
  if (score >= 75) return 'In the room, not at the desk.'
  if (score >= 50) return 'A cousin, twice removed.'
  if (score >= 25) return 'A rumor of the right word.'
  return 'A different language, possibly.'
}

export function editsLabel(distance: number): string {
  if (distance === 0) return 'no edits'
  if (distance === 1) return '1 edit'
  return `${distance} edits`
}

export function totalScore(scores: Array<{ score: number } | null>): number {
  return scores.reduce((sum, item) => sum + (item?.score ?? 0), 0)
}
