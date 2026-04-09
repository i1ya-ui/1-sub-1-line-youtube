import type { Session } from '../types'

const KEY = '1sub1line_session'

function normalizeSession(s: Session): Session {
  if (!s?.user) return s
  return { ...s, user: { ...s.user, id: Number(s.user.id) } }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return normalizeSession(JSON.parse(raw) as Session)
  } catch {
    return null
  }
}

export function saveSession(session: Session | null): void {
  if (!session) {
    localStorage.removeItem(KEY)
    return
  }
  localStorage.setItem(KEY, JSON.stringify(normalizeSession(session)))
}
