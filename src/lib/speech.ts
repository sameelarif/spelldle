export type SpeechStatus = 'ok' | 'missing' | 'blocked'

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const pool = en.length > 0 ? en : voices
  const preferred = pool.find((v) =>
    /google|samantha|daniel|alex|aria|jenny|natural/i.test(v.name),
  )
  return preferred ?? pool[0] ?? null
}

let voicesReady: Promise<void> | null = null

function waitForVoices(): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve()
  }
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve()
  if (voicesReady) return voicesReady
  voicesReady = new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done)
      resolve()
    }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    window.setTimeout(done, 400)
  })
  return voicesReady
}

export function speechStatus(): SpeechStatus {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 'missing'
  return 'ok'
}

export async function speak(text: string, rate = 0.86): Promise<boolean> {
  if (speechStatus() !== 'ok') return false
  await waitForVoices()
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = 1
  utterance.lang = 'en-US'
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    utterance.onend = () => finish(true)
    utterance.onerror = () => finish(false)
    try {
      window.speechSynthesis.speak(utterance)
      // Chrome can park the queue; a nudge keeps it honest.
      window.setTimeout(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      }, 40)
    } catch {
      finish(false)
    }
  })
}

export function speakWord(word: string, slow = false): Promise<boolean> {
  return speak(word, slow ? 0.52 : 0.86)
}

export function speakSyllables(syllables: string): Promise<boolean> {
  const parts = syllables.split('-').filter(Boolean)
  return speak(parts.join('. '), 0.64)
}

export function stopSpeaking(): void {
  if (speechStatus() === 'ok') window.speechSynthesis.cancel()
}
