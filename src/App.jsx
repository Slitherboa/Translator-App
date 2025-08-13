import React, { useEffect, useMemo, useRef, useState } from 'react'
import { translateText } from './api/translate.js'

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
]

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

function App() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('es')
  const [isTranslating, setIsTranslating] = useState(false)
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('translation-history')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [provider, setProvider] = useState(null)

  const controllerRef = useRef(null)
  const debouncedText = useDebouncedValue(sourceText, 400)

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    localStorage.setItem('translation-history', JSON.stringify(history.slice(0, 25)))
  }, [history])

  useEffect(() => {
    // Detect current provider from backend
    fetch('/api/')
      .then((r) => r.ok ? r.json() : { provider: null })
      .then((d) => setProvider(d?.provider || null))
      .catch(() => setProvider(null))
  }, [])

  useEffect(() => {
    if (!debouncedText.trim()) {
      setTranslatedText('')
      return
    }
    translate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText, sourceLang, targetLang])

  async function translate() {
    if (!debouncedText.trim()) return
    if (controllerRef.current) controllerRef.current.abort()
    controllerRef.current = new AbortController()

    setIsTranslating(true)
    const result = await translateText(debouncedText, sourceLang, targetLang, controllerRef.current.signal)
    setIsTranslating(false)
    setTranslatedText(result)

    if (result && !result.startsWith('[unavailable]')) {
      setHistory((prev) => {
        const next = [{
          id: Date.now(),
          sourceText: debouncedText,
          translatedText: result,
          sourceLang,
          targetLang,
        }, ...prev]
        return next.slice(0, 25)
      })
    }
  }

  function swapLanguages() {
    setSourceLang((prev) => {
      const newSource = targetLang
      setTargetLang(prev)
      setSourceText(translatedText || sourceText)
      setTranslatedText('')
      return newSource
    })
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  function speak(text, lang) {
    if (!canSpeak || !text) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const languageOptions = useMemo(() => LANGUAGE_OPTIONS, [])

  return (
    <div className="app">
      <header className="app__header">
        <h1>Translator</h1>
        <p className="app__subtitle">Simple, fast translations powered by GPT</p>
        <div className="provider {provider ? '' : 'provider--off'}" role="status" aria-live="polite">
          Provider: {provider || 'offline'}
        </div>
      </header>

      <section className="controls">
        <div className="control">
          <label htmlFor="sourceLang">From</label>
          <select id="sourceLang" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            {languageOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button className="btn btn--ghost swap" onClick={swapLanguages} aria-label="Swap languages">⇄</button>

        <div className="control">
          <label htmlFor="targetLang">To</label>
          <select id="targetLang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            {languageOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>

      <main className="panes">
        <div className="pane">
          <textarea
            placeholder="Type text to translate..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={8}
          />
          <div className="pane__actions">
            <button className="btn" onClick={() => setSourceText('')}>Clear</button>
            <button className="btn" onClick={() => copyToClipboard(sourceText)}>Copy</button>
            {canSpeak && <button className="btn" onClick={() => speak(sourceText, sourceLang)}>Speak</button>}
          </div>
        </div>

        <div className="pane">
          <textarea
            placeholder={isTranslating ? 'Translating…' : 'Translation'}
            value={translatedText}
            readOnly
            rows={8}
          />
          <div className="pane__actions">
            <button className="btn btn--primary" disabled={isTranslating || !debouncedText.trim()} onClick={translate} aria-busy={isTranslating}>
              {isTranslating ? 'Translating…' : 'Translate now'}
            </button>
            <button className="btn" disabled={!translatedText} onClick={() => copyToClipboard(translatedText)}>Copy</button>
            {canSpeak && <button className="btn" disabled={!translatedText} onClick={() => speak(translatedText, targetLang)}>Speak</button>}
          </div>
        </div>
      </main>

      <section className="history">
        <div className="history__header">
          <h2>Recent</h2>
          <button className="btn btn--ghost" onClick={() => setHistory([])}>Clear history</button>
        </div>
        {history.length === 0 ? (
          <p className="history__empty">No translations yet.</p>
        ) : (
          <ul className="history__list">
            {history.map((item) => (
              <li key={item.id} className="history__item">
                <div className="history__langs" aria-label={`from ${item.sourceLang} to ${item.targetLang}`}>
                  <span>{item.sourceLang}</span>
                  <span>→</span>
                  <span>{item.targetLang}</span>
                </div>
                <div className="history__texts">
                  <div className="history__source">{item.sourceText}</div>
                  <div className="history__arrow">→</div>
                  <div className="history__target">{item.translatedText}</div>
                </div>
                <div className="history__actions">
                  <button className="btn btn--sm" onClick={() => setSourceText(item.sourceText)}>Reuse</button>
                  <button className="btn btn--sm" onClick={() => copyToClipboard(item.translatedText)}>Copy</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="app__footer">
        <span>Built with React + Vite</span>
        <a href="https://platform.openai.com/docs/overview" target="_blank" rel="noreferrer">OpenAI API</a>
      </footer>
    </div>
  )
}

export default App


