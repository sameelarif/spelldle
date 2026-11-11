import { yesterdayISO } from './date'
import type { DayRecord, Store, WordResult } from './types'

const KEY = 'spelldle.v1'

const empty = (): Store => ({
  version: 1,
  streak: 0,
  bestStreak: 0,
  lastCompleted: null,
  days: {},
})

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Store
    if (parsed?.version !== 1 || typeof parsed.days !== 'object') return empty()
    return {
      version: 1,
      streak: Number(parsed.streak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      lastCompleted: parsed.lastCompleted ?? null,
      days: parsed.days ?? {},
    }
  } catch {
    return empty()
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Private mode or full storage. The day still works in memory.
  }
}

export function emptyDay(date: string, answers: [string, string, string]): DayRecord {
  return {
    date,
    answers,
    results: [null, null, null],
    completed: false,
  }
}

export function recordGuess(
  store: Store,
  date: string,
  answers: [string, string, string],
  index: 0 | 1 | 2,
  result: WordResult,
): Store {
  const day = store.days[date] ?? emptyDay(date, answers)
  const results = [...day.results] as DayRecord['results']
  results[index] = result
  const completed = results.every(Boolean)
  const nextDay: DayRecord = { ...day, answers, results, completed }
  const days = { ...store.days, [date]: nextDay }

  if (!completed) {
    const next = { ...store, days }
    saveStore(next)
    return next
  }

  let streak = store.streak
  if (store.lastCompleted === date) {
    streak = store.streak
  } else if (store.lastCompleted === yesterdayISO(date)) {
    streak = store.streak + 1
  } else {
    streak = 1
  }

  const next: Store = {
    ...store,
    days,
    streak,
    bestStreak: Math.max(store.bestStreak, streak),
    lastCompleted: date,
  }
  saveStore(next)
  return next
}

export function dayRecord(store: Store, date: string): DayRecord | undefined {
  return store.days[date]
}
