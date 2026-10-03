# Valency Formula Lab

Interactive junior-chemistry courseware for turning **valency into chemical formulas**.

## Features

- Component bay for common cations / anions
- Auto-derive simplest ratios (cross valency + GCD)
- 5-step teaching flow (mark → cross → subscript → simplify → verify)
- **3D balance chamber** with OrbitControls (drag to rotate, scroll to zoom)
- English / Chinese / French toggle (**default: English**)
- Digestive-system lab: drag a tomato from chewing to gastric pepsin and mucosa-cell enzyme production

## Run

```bash
npm install
npm run dev
```

To enable live GPT-5.6 Terra or Gemini 3.6 Flash coaching, copy `.env.example` to `.env.local` and set `AI_GATEWAY_API_KEY`. Without a key the guarded local scaffold still runs (fixed-prompt comparison condition).

## Electrochemistry scaffolding

The battery lab coach follows Predict → Explain → Inspect → Diagnose → Hint → Revise → Independent check. Adaptive mode calls Vercel AI Gateway (`openai/gpt-5.6-terra` or `google/gemini-3.6-flash`). Fixed mode uses the same ladder without a model. Both conditions log asks so later sessions can be compared.

If the same question is asked fewer times across sessions, the Evidence tab marks fading as effective.

Student data is **not** stored as Markdown. Phase A uses an append-only JSONL event log at `data/learning/events.jsonl` (gitignored, exportable). A later classroom pilot should move the same event schema to Postgres. Identifiers are anonymous UUIDs, not names.

## Stack

Vite · React · TypeScript · React Three Fiber · Drei · Vercel AI SDK
