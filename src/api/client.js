const API_BASE = import.meta.env.VITE_API_URL || '/api'
export const get = (path) => fetch(`${API_BASE}${path}`).then((r) => r.json())
export const post = (path, body) =>
  fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
export const del = (path) => fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then((r) => r.json())
