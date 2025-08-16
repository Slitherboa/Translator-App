async function callBackend(text, sourceLang, targetLang, abortSignal) {
  const res = await fetch(`/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLang, targetLang }),
    signal: abortSignal,
  })
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const maybeJson = await res.json()
      if (maybeJson && typeof maybeJson.error === 'string') {
        errorMessage = `${errorMessage} ${maybeJson.error}`
      }
    } catch {
      // ignore body parse errors
    }
    const error = new Error(errorMessage)
    // Attach status so callers can branch without string parsing
    // eslint-disable-next-line no-extra-boolean-cast
    ;(error).status = res.status
    throw error
  }
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
    const status = err && (err.status || err.code)
    if (status === 429) return `[rate-limited] ${text}`
    if (status === 401 || status === 403) return `[unauthorized] ${text}`
    if (status === 503) return `[not-configured] ${text}`
    return `[unavailable] ${text}`
  }
}


