import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Bee } from './Bee'
import {
  formatLongDate,
  formatShortDate,
  localDateISO,
  tomorrowName,
} from '../lib/date'
import { getPuzzle, puzzleAnswers } from '../lib/puzzle'
import {
  closenessLabel,
  editsLabel,
  scoreGuess,
  totalScore,
} from '../lib/score'
import {
  speakSyllables,
  setSpeakVolume,
  speakWord,
  speechStatus,
  stopSpeaking,
} from '../lib/speech'
import { shareText } from '../lib/share'
import { dayRecord, loadStore, recordGuess } from '../lib/storage'
import type { Store, Word, WordResult } from '../lib/types'

type HintId = 'definition' | 'pos' | 'origin' | 'sentence' | 'syllables'
type Phase = 'play' | 'reveal' | 'results'

const HINTS: { id: HintId; label: string }[] = [
  { id: 'definition', label: 'Definition' },
  { id: 'pos', label: 'Part of speech' },
  { id: 'origin', label: 'Origin' },
  { id: 'sentence', label: 'Sentence' },
  { id: 'syllables', label: 'Syllables' },
]

function initialIndex(results: Array<WordResult | null>): 0 | 1 | 2 {
  const idx = results.findIndex((item) => item === null)
  return (idx === -1 ? 0 : idx) as 0 | 1 | 2
}

function boardLine(result: WordResult | null): string {
  if (!result) return '—'
  if (result.perfect) return 'solid'
  if (result.score >= 70) return 'close'
  return 'miss'
}

function flavorTotal(score: number): string {
  if (score === 300) return 'A perfect paper. Sit down before you faint.'
  if (score >= 270) return 'The bee almost nodded. That is as warm as it gets.'
  if (score >= 210) return 'Respectable. The dictionary will allow you back.'
  if (score >= 150) return 'You were in the building. Not always at the right desk.'
  return 'Tomorrow is a different bee. This one has left the room.'
}

export function Game() {
  const date = useMemo(() => localDateISO(), [])
  const puzzle = useMemo(() => getPuzzle(date), [date])
  const answers = useMemo(() => puzzleAnswers(puzzle), [puzzle])

  const [store, setStore] = useState<Store>(() => loadStore())
  const today = dayRecord(store, date)
  const results = today?.results ?? [null, null, null]

  const [index, setIndex] = useState<0 | 1 | 2>(() =>
    today?.completed ? 2 : initialIndex(today?.results ?? [null, null, null]),
  )
  const [phase, setPhase] = useState<Phase>(() => (today?.completed ? 'results' : 'play'))
  const [guess, setGuess] = useState('')
  const [openHints, setOpenHints] = useState<HintId[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [speechOk, setSpeechOk] = useState(() => speechStatus() === 'ok')
  const [emptyError, setEmptyError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [heard, setHeard] = useState(false)
  const [volume, setVolume] = useState(1)
  const [volumeDrag, setVolumeDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const volumeRef = useRef(1)
  const skipPlayClick = useRef(false)
  const volumeDragRef = useRef<{
    id: number
    y: number
    start: number
    moved: boolean
  } | null>(null)
  const guessRef = useRef(guess)
  const phaseRef = useRef(phase)
  const storeRef = useRef(store)
  const indexRef = useRef(index)
  guessRef.current = guess
  phaseRef.current = phase
  storeRef.current = store
  indexRef.current = index

  const word = puzzle[index]
  const revealed = phase === 'reveal' ? results[index] : null

  useEffect(() => {
    setSpeechOk(speechStatus() === 'ok')
  }, [])

  useEffect(() => {
    if (phase === 'play') inputRef.current?.focus()
  }, [phase, index])

  function focusInput() {
    inputRef.current?.focus()
  }

  function onGuessChange(value: string) {
    setEmptyError(false)
    setGuess(value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24))
  }

  function submit() {
    if (phaseRef.current !== 'play') return
    const current = guessRef.current.trim()
    if (current.length === 0) {
      setEmptyError(true)
      focusInput()
      return
    }
    stopSpeaking()
    const currentIndex = indexRef.current
    const scored = scoreGuess(current, puzzle[currentIndex].word)
    const result: WordResult = {
      guess: scored.normalized,
      score: scored.score,
      distance: scored.distance,
      perfect: scored.perfect,
    }
    const next = recordGuess(storeRef.current, date, answers, currentIndex, result)
    setStore(next)
    setPhase('reveal')
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const phaseNow = phaseRef.current
      if (phaseNow === 'reveal' && event.key === 'Enter') {
        event.preventDefault()
        nextWord()
        return
      }
      if (phaseNow !== 'play') return
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
        return
      }
      const inField = (event.target as HTMLElement | null)?.id === 'spelling'
      if (inField) return
      if (event.key === 'Backspace') {
        event.preventDefault()
        setEmptyError(false)
        setGuess((value) => value.slice(0, -1))
        return
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault()
        setEmptyError(false)
        setGuess((value) => (value + event.key.toLowerCase()).slice(0, 24))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function playWord(slow = false) {
    setHeard(true)
    if (speechStatus() !== 'ok') {
      setSpeechOk(false)
      focusInput()
      return
    }
    setSpeaking(true)
    const ok = await speakWord(word.word, slow)
    setSpeaking(false)
    if (!ok) setSpeechOk(false)
    focusInput()
  }

  function applyVolume(next: number) {
    const value = Math.min(1, Math.max(0, next))
    volumeRef.current = value
    setVolume(value)
    setSpeakVolume(value)
  }

  function onPlayPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    skipPlayClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    volumeDragRef.current = {
      id: event.pointerId,
      y: event.clientY,
      start: volumeRef.current,
      moved: false,
    }
  }

  function onPlayPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = volumeDragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const dy = drag.y - event.clientY
    if (!drag.moved && Math.abs(dy) < 8) return
    drag.moved = true
    skipPlayClick.current = true
    setVolumeDrag(true)
    applyVolume(drag.start + dy / 120)
  }

  function endVolumeDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = volumeDragRef.current
    if (!drag || drag.id !== event.pointerId) return
    if (drag.moved) skipPlayClick.current = true
    volumeDragRef.current = null
    setVolumeDrag(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onPlayClick() {
    if (skipPlayClick.current) {
      skipPlayClick.current = false
      return
    }
    void playWord(false)
  }

  async function playSyllables() {
    setHeard(true)
    toggleHint('syllables')
    if (speechStatus() !== 'ok') {
      setSpeechOk(false)
      focusInput()
      return
    }
    setSpeaking(true)
    const ok = await speakSyllables(word.syllables)
    setSpeaking(false)
    if (!ok) setSpeechOk(false)
    focusInput()
  }

  function toggleHint(id: HintId) {
    setOpenHints((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
    focusInput()
  }

  function nextWord() {
    if (indexRef.current === 2) {
      setPhase('results')
      return
    }
    const nextIndex = (indexRef.current + 1) as 0 | 1 | 2
    setIndex(nextIndex)
    setGuess('')
    setOpenHints([])
    setHeard(false)
    setEmptyError(false)
    setPhase('play')
    void (async () => {
      const next = puzzle[nextIndex]
      setSpeaking(true)
      const ok = await speakWord(next.word)
      setSpeaking(false)
      setHeard(true)
      if (!ok) setSpeechOk(false)
    })()
  }

  async function copyScore() {
    const text = shareText(date, results)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
      setCopied(true)
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <Bee size={42} />
          <div>
            <h1>Spelldle</h1>
            <p className="tag">Hear it. Spell it. Three a day.</p>
          </div>
        </div>
        <p className="date-line">
          <time dateTime={date}>{formatLongDate(date)}</time>
        </p>
      </header>

      {phase === 'results' ? (
        <Results
          date={date}
          puzzle={puzzle}
          results={results}
          copied={copied}
          onCopy={() => void copyScore()}
        />
      ) : (
        <main className="card">
          <Progress results={results} index={index} />

          {!speechOk && (
            <p className="banner" role="status">
              Your browser has taken a vow of silence. Hints still work; so does
              guessing.
            </p>
          )}

          <div className="play-wrap">
            <button
              type="button"
              className={`play ${speaking ? 'is-speaking' : ''} ${volumeDrag ? 'is-volume' : ''}`}
              style={{ '--vol': volume } as CSSProperties}
              onClick={onPlayClick}
              onPointerDown={onPlayPointerDown}
              onPointerMove={onPlayPointerMove}
              onPointerUp={endVolumeDrag}
              onPointerCancel={endVolumeDrag}
              aria-label={heard ? 'Hear the word again' : 'Hear the word'}
            >
              <span className="vol-fill" aria-hidden="true" />
              <PlayIcon speaking={speaking} />
            </button>
            <p className="play-label" aria-live="polite">
              {volumeDrag
                ? `${Math.round(volume * 100)}%`
                : speaking
                  ? 'Speaking…'
                  : heard
                    ? 'Once more'
                    : 'Hear it'}
            </p>
            <p className="word-count">Word {index + 1} of 3</p>
          </div>

          <form
            className={`spell-form ${emptyError ? 'is-shake' : ''}`}
            onSubmit={(event) => {
              event.preventDefault()
              if (phase === 'reveal') nextWord()
              else submit()
            }}
          >
            <div className="spell-field">
              <label className="sr-only" htmlFor="spelling">
                Your spelling
              </label>
              <Tiles
                guess={phase === 'reveal' ? (revealed?.guess ?? guess) : guess}
                active={phase === 'play'}
                perfect={revealed?.perfect}
                onActivate={focusInput}
              />
              <input
                id="spelling"
                ref={inputRef}
                className="spell-input"
                value={phase === 'reveal' ? (revealed?.guess ?? guess) : guess}
                onChange={(event) => onGuessChange(event.target.value)}
                onInput={(event) => onGuessChange(event.currentTarget.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                maxLength={24}
                disabled={phase !== 'play'}
                placeholder="type what you heard"
                aria-invalid={emptyError}
                name="spelling"
              />
            </div>
            {emptyError && (
              <p className="error" role="alert">
                The judges decline to grade a blank stare.
              </p>
            )}

            {phase === 'play' && (
              <>
                <HintBar
                  openHints={openHints}
                  onToggle={toggleHint}
                  onRepeat={() => void playWord(false)}
                  onSlow={() => void playWord(true)}
                  onSyllables={() => void playSyllables()}
                />
                <HintBody word={word} openHints={openHints} />
              </>
            )}

            {phase === 'reveal' && revealed && (
              <Reveal word={word} result={revealed} />
            )}

            <button type="submit" className="submit">
              {phase === 'reveal'
                ? index === 2
                  ? 'See the board'
                  : 'Next word'
                : 'That’s my spelling'}
            </button>
          </form>
        </main>
      )}

      <footer className="foot">
        <p>Local only. No accounts. The bee does not do newsletters.</p>
        <p className="muted">
          {tomorrowName(date)}’s words are locked in a drawer.
        </p>
      </footer>
    </div>
  )
}

function Progress({
  results,
  index,
}: {
  results: Array<WordResult | null>
  index: number
}) {
  return (
    <ol className="progress" aria-label="Puzzle progress">
      {[0, 1, 2].map((i) => {
        const result = results[i]
        const state = result
          ? boardLine(result)
          : i === index
            ? 'now'
            : 'todo'
        return (
          <li key={i} className={state}>
            <span className="sr-only">
              Word {i + 1}
              {result ? `, ${result.score}` : i === index ? ', current' : ', locked'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Tiles({
  guess,
  active,
  perfect,
  onActivate,
}: {
  guess: string
  active: boolean
  perfect?: boolean
  onActivate: () => void
}) {
  const letters = guess.split('')
  return (
    <div
      className={`tiles ${perfect ? 'is-perfect' : ''}`}
      aria-hidden="true"
      onClick={onActivate}
    >
      {letters.length === 0 && <span className="tile is-ghost">?</span>}
      {letters.map((letter, i) => (
        <span className="tile" key={`${letter}-${i}`} style={{ animationDelay: `${i * 28}ms` }}>
          {letter}
        </span>
      ))}
      {active && letters.length > 0 && <span className="caret" />}
    </div>
  )
}

function HintBar({
  openHints,
  onToggle,
  onRepeat,
  onSlow,
  onSyllables,
}: {
  openHints: HintId[]
  onToggle: (id: HintId) => void
  onRepeat: () => void
  onSlow: () => void
  onSyllables: () => void
}) {
  return (
    <div className="hints" role="toolbar" aria-label="Spelling bee hints">
      <button type="button" onClick={onRepeat}>
        Repeat
      </button>
      <button type="button" onClick={onSlow}>
        Slowly
      </button>
      {HINTS.map((hint) => (
        <button
          key={hint.id}
          type="button"
          aria-pressed={openHints.includes(hint.id)}
          className={openHints.includes(hint.id) ? 'is-open' : ''}
          onClick={() => (hint.id === 'syllables' ? onSyllables() : onToggle(hint.id))}
        >
          {hint.label}
        </button>
      ))}
    </div>
  )
}

function HintBody({ word, openHints }: { word: Word; openHints: HintId[] }) {
  if (openHints.length === 0) {
    return <p className="hint-empty">Hints if you need them. The bee pretends not to watch.</p>
  }
  return (
    <ul className="hint-list">
      {openHints.map((id) => (
        <li key={id} className="hint-card">
          <p className="hint-kicker">{labelFor(id)}</p>
          <p>{textFor(word, id)}</p>
        </li>
      ))}
    </ul>
  )
}

function labelFor(id: HintId): string {
  return HINTS.find((hint) => hint.id === id)?.label ?? id
}

function textFor(word: Word, id: HintId): string {
  if (id === 'definition') return word.definition
  if (id === 'pos') return word.pos
  if (id === 'origin') return word.origin
  if (id === 'sentence') return word.sentence
  return word.syllables
}

function Reveal({ word, result }: { word: Word; result: WordResult }) {
  return (
    <div className="reveal" aria-live="polite">
      <p className="reveal-score">
        <span className="score-num">{result.score}</span>
        <span className="score-of">/100</span>
      </p>
      <p className="reveal-label">{closenessLabel(result.score, result.perfect)}</p>
      <div className="compare">
        <p>
          <span className="kicker">You</span> {result.guess || '—'}
        </p>
        <p>
          <span className="kicker">Bee</span> {word.word}
        </p>
      </div>
      <p className="muted">
        {result.perfect ? 'Clean sheet.' : `${editsLabel(result.distance)} away.`}
      </p>
    </div>
  )
}

function Results({
  date,
  puzzle,
  results,
  copied,
  onCopy,
}: {
  date: string
  puzzle: [Word, Word, Word]
  results: Array<WordResult | null>
  copied: boolean
  onCopy: () => void
}) {
  const total = totalScore(results)
  const perfectDay = results.every((item) => item?.perfect)
  return (
    <main className="card results">
      <p className="kicker">The board · {formatShortDate(date)}</p>
      <p className="total">
        <span className="score-num">{total}</span>
        <span className="score-of">/300</span>
      </p>
      <p className="reveal-label">{perfectDay ? 'A perfect day is not a myth.' : flavorTotal(total)}</p>
      <ol className="board">
        {puzzle.map((word, i) => {
          const result = results[i]
          return (
            <li key={word.word} className={boardLine(result)}>
              <span className="board-mark" aria-hidden="true" />
              <div>
                <p className="board-word">{word.word}</p>
                <p className="muted">
                  you {result?.guess || '—'} · {result?.score ?? 0}/100
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      <button type="button" className="submit" onClick={onCopy}>
        {copied ? 'Copied. Brag elsewhere.' : 'Copy score (no spoilers)'}
      </button>
      <p className="tomorrow">
        {tomorrowName(date)}’s puzzle is locked. The words are napping.
      </p>
    </main>
  )
}

function PlayIcon({ speaking }: { speaking: boolean }) {
  if (speaking) {
    return (
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <rect x="4" y="6" width="4" height="12" rx="1" fill="currentColor">
          <animate attributeName="height" values="12;6;12" dur="0.7s" repeatCount="indefinite" />
          <animate attributeName="y" values="6;9;6" dur="0.7s" repeatCount="indefinite" />
        </rect>
        <rect x="10" y="4" width="4" height="16" rx="1" fill="currentColor">
          <animate attributeName="height" values="16;8;16" dur="0.7s" begin="0.15s" repeatCount="indefinite" />
          <animate attributeName="y" values="4;8;4" dur="0.7s" begin="0.15s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="7" width="4" height="10" rx="1" fill="currentColor">
          <animate attributeName="height" values="10;16;10" dur="0.7s" begin="0.3s" repeatCount="indefinite" />
          <animate attributeName="y" values="7;4;7" dur="0.7s" begin="0.3s" repeatCount="indefinite" />
        </rect>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <path d="M5 12a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12a4 4 0 0 1 8 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="16.5" r="1.6" fill="currentColor" />
    </svg>
  )
}
