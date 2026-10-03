import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function parseEnvFile(raw: string) {
  const parsed: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }
  return parsed
}

function searchRoots() {
  const roots = new Set<string>()
  roots.add(process.cwd())
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    roots.add(here)
    roots.add(resolve(here, '..'))
  } catch {
    // import.meta.url unavailable in some bundles
  }
  return [...roots]
}

export function gatewayStatus() {
  const files = ['.env.local', '.env', '.env.development.local', '.env.development']
  let value = ''
  let loadedFrom = ''
  for (const root of searchRoots()) {
    for (const name of files) {
      const path = resolve(root, name)
      try {
        const parsed = parseEnvFile(readFileSync(path, 'utf8'))
        const next = parsed.AI_GATEWAY_API_KEY || parsed.VERCEL_OIDC_TOKEN || ''
        if (next) {
          value = next
          loadedFrom = path
          break
        }
      } catch {
        // try the next candidate
      }
    }
    if (value) break
  }
  if (value) {
    process.env['AI_GATEWAY_API_KEY'] = value
  }
  return {
    configured: Boolean(value),
    chars: value.length,
    prefix: value.slice(0, 4),
    loadedFrom: loadedFrom ? loadedFrom.replace(/^[A-Za-z]:/, '') : '',
    cwd: process.cwd(),
  }
}

export function gatewayApiKey() {
  return gatewayStatus().configured ? process.env['AI_GATEWAY_API_KEY'] ?? '' : ''
}

export function hasGatewayKey() {
  return gatewayStatus().configured
}
