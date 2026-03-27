const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

export const get = (path, token) =>
  request(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

export const post = (path, body, token) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
