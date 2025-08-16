import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Load .env from project root explicitly so it works regardless of cwd
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787

function chooseProvider() {
  const preferred = (process.env.PREFERRED_PROVIDER || '').toLowerCase()
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)

  if (preferred === 'openai' && hasOpenAI) return 'openai'
  if (preferred === 'anthropic' && hasAnthropic) return 'anthropic'
  if (hasOpenAI) return 'openai'
  if (hasAnthropic) return 'anthropic'
  return null
}

function buildPrompt(text, sourceLang, targetLang) {
  return `You are a professional translator. Translate the user's text strictly from ${sourceLang} to ${targetLang}.

Text:
"""
${text}
"""

Rules:
- Output only the translated text, no quotes, no explanations.
- Preserve formatting and punctuation.`
}

async function translateWithOpenAI({ text, sourceLang, targetLang }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  // Use Chat Completions for broad compatibility
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a helpful translation assistant.' },
      { role: 'user', content: buildPrompt(text, sourceLang, targetLang) },
    ],
    temperature: 0.2,
  })
  const choice = completion.choices?.[0]
  const content = choice?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return typeof content === 'string' ? content.trim() : String(content).trim()
}

async function translateWithAnthropic({ text, sourceLang, targetLang }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'

  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0.2,
    messages: [
      { role: 'user', content: buildPrompt(text, sourceLang, targetLang) },
    ],
  })

  const contentBlocks = msg.content || []
  const textParts = contentBlocks
    .map((b) => (b && b.type === 'text' ? b.text : ''))
    .filter(Boolean)
  const output = textParts.join('\n').trim()
  if (!output) throw new Error('Empty response from Anthropic')
  return output
}

app.get('/', (_req, res) => {
  res.json({ ok: true, provider: chooseProvider() })
})

app.post('/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' })
    }
    const src = (sourceLang || 'auto').toString()
    const tgt = (targetLang || 'en').toString()

    const provider = chooseProvider()
    if (!provider) {
      return res.status(503).json({ error: 'No provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.' })
    }

    let translation = ''
    if (provider === 'openai') {
      translation = await translateWithOpenAI({ text, sourceLang: src, targetLang: tgt })
    } else {
      translation = await translateWithAnthropic({ text, sourceLang: src, targetLang: tgt })
    }

    res.json({ translation, provider })
  } catch (err) {
    // Try to propagate upstream status codes like 401/403/429 to the client
    const status = err?.status || err?.response?.status || 500
    const message = err?.message || 'Unknown error'
    // eslint-disable-next-line no-console
    console.error('Translate error:', status, message)
    res.status(status).json({ error: message })
  }
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Translation server listening on http://localhost:${PORT}`)
})


