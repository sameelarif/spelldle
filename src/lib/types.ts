export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'

export type Word = {
  word: string
  pos: PartOfSpeech
  definition: string
  origin: string
  sentence: string
  syllables: string
  tier: 1 | 2 | 3
}

export type WordResult = {
  guess: string
  score: number
  distance: number
  perfect: boolean
}

export type DayRecord = {
  date: string
  answers: [string, string, string]
  results: [WordResult | null, WordResult | null, WordResult | null]
  completed: boolean
}

export type Store = {
  version: 1
  days: Record<string, DayRecord>
}
