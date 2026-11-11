import type { Word } from './types'
import { WORDS } from './words'

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne(pool: Word[], rng: () => number): Word {
  return pool[Math.floor(rng() * pool.length)]
}

export function getPuzzle(dateISO: string): [Word, Word, Word] {
  const rng = mulberry32(hashString(`spelldle:v1:${dateISO}`))
  const t1 = WORDS.filter((w) => w.tier === 1)
  const t2 = WORDS.filter((w) => w.tier === 2)
  const t3 = WORDS.filter((w) => w.tier === 3)
  return [pickOne(t1, rng), pickOne(t2, rng), pickOne(t3, rng)]
}

export function puzzleAnswers(words: [Word, Word, Word]): [string, string, string] {
  return [words[0].word, words[1].word, words[2].word]
}
