async function callBackend(text, sourceLang, targetLang, abortSignal) {
  const res = await fetch(`/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLang, targetLang }),
    signal: abortSignal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data && typeof data.translation === 'string') return data.translation
  throw new Error('Invalid backend response')
}

export async function translateText(text, sourceLang, targetLang, abortSignal) {
  if (!text || !text.trim()) return ''
  const trimmed = text.trim()
  try {
    return await callBackend(trimmed, sourceLang, targetLang, abortSignal)
  } catch (err) {
    return `[unavailable] ${text}`
  }
}


