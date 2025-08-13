# Translator Application 
Simple Translator Web App built with React + Vite.

## Scripts

- `npm install` – install dependencies
- `npm run dev` – start dev server on http://localhost:5173
- `npm run build` – production build
- `npm run preview` – preview the build locally
- `npm run server` – start the translation backend on http://localhost:8787

## Provider options

This app can translate using:

1) OpenAI (GPT) – via official API (requires `OPENAI_API_KEY`)
2) Anthropic (Claude) – via official API (requires `ANTHROPIC_API_KEY`)
3) Public MyMemory – previously used as a fallback; now removed in the default setup

### Configure environment

Create a `.env` file in the project root:

```
PORT=8787
# Choose ONE or both providers. The backend will pick the first available.
OPENAI_API_KEY=sk-...
# For OpenAI, optionally override model (default: gpt-4o-mini):
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=sk-ant-...
# For Anthropic, optionally override model (default: claude-3-haiku-20240307):
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

Then run:

```
npm run server
```

And in another terminal:

```
npm run dev
```

The frontend calls `/api/translate` (proxied to the backend in dev). If the backend is not running or returns an error, the UI shows `[unavailable] <text>` and does not fall back to any public API.

## Notes

- Uses OpenAI (or Anthropic) via the backend only. No public API fallback.
- Recent translations are saved in `localStorage`.
- Text-to-Speech uses the Web Speech API when available.


