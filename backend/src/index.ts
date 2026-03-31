import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Pool } from 'pg'

type UserRecord = { id: number; name: string; password_hash: string }
type AuthResponse = { token: string; user: { id: number; name: string } }
type AuthRequest = Request & { user?: JwtPayload & { id: number; name: string } }

const app = express()
app.disable('x-powered-by')
const port = Number(process.env.PORT || 3001)
const secret = process.env.JWT_SECRET || 'dev-secret'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const MAX_POST_BODY = 2000
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '256kb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

const sign = (user: UserRecord): string =>
  jwt.sign({ id: user.id, name: user.name }, secret, { expiresIn: '7d' })

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, storedHash] = encoded.split(':')
  if (!salt || !storedHash) return false
  const hash = scryptSync(password, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE TABLE IF NOT EXISTS posts (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)')
}

const auth = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(token, secret)
    if (typeof payload === 'string') return res.status(401).json({ error: 'Invalid token' })
    req.user = payload as JwtPayload & { id: number; name: string }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.post('/api/auth/signup', async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const name = (req.body?.name as string | undefined)?.trim()
  const password = req.body?.password as string | undefined
  if (!name || !password || password.length < 4) return res.status(400).json({ error: 'Bad credentials' })
  if (!NAME_RE.test(name)) return res.status(400).json({ error: 'Bad name' })
  if (password.length > 128) return res.status(400).json({ error: 'Bad credentials' })
  const exists = await pool.query<UserRecord>('SELECT id, name, password_hash FROM users WHERE name = $1', [name])
  if (exists.rowCount) return res.status(409).json({ error: 'User exists' })
  const password_hash = hashPassword(password)
  const created = await pool.query<UserRecord>(
    'INSERT INTO users (name, password_hash) VALUES ($1, $2) RETURNING id, name, password_hash',
    [name, password_hash],
  )
  const user = created.rows[0]
  return res.json({ token: sign(user), user: { id: user.id, name: user.name } })
})

app.post('/api/auth/login', async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const name = (req.body?.name as string | undefined)?.trim()
  const password = req.body?.password as string | undefined
  if (name && !NAME_RE.test(name)) return res.status(400).json({ error: 'Bad name' })
  const found = name
    ? await pool.query<UserRecord>('SELECT id, name, password_hash FROM users WHERE name = $1', [name])
    : null
  const user = found?.rows[0]
  if (!user || !password) return res.status(401).json({ error: 'Invalid login' })
  const ok = verifyPassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid login' })
  return res.json({ token: sign(user), user: { id: user.id, name: user.name } })
})

app.get('/api/auth/me', auth, (req: AuthRequest, res: Response) =>
  res.json({ user: { id: req.user?.id, name: req.user?.name } }),
)

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: true })
  } catch {
    res.status(503).json({ ok: false, db: false })
  }
})

app.get('/api/users/:name', async (req: Request, res: Response) => {
  const name = (req.params.name as string | undefined)?.trim()
  if (!name) return res.status(400).json({ error: 'Bad name' })
  const r = await pool.query<{ id: number; name: string }>('SELECT id, name FROM users WHERE name = $1', [name])
  if (!r.rowCount) return res.status(404).json({ error: 'Not found' })
  return res.json({ user: r.rows[0] })
})

app.get('/api/posts', async (_req: Request, res: Response) => {
  const r = await pool.query('SELECT p.id, p.body, u.name, p.created_at, p.likes FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 50')
  res.json({ posts: r.rows.map((x) => ({ id: Number(x.id), text: x.body, author: x.name, date: x.created_at.toISOString().slice(5, 10), likes: Number(x.likes) || 0 })) })
})

app.post('/api/posts', auth, async (req: AuthRequest, res: Response) => {
  const body = (req.body?.body as string | undefined)?.trim()
  if (!body) return res.status(400).json({ error: 'Empty' })
  if (body.length > MAX_POST_BODY) return res.status(400).json({ error: 'Too long' })
  const ins = await pool.query<{ id: string }>(
    'INSERT INTO posts (user_id, body) VALUES ($1, $2) RETURNING id',
    [req.user!.id, body],
  )
  res.json({ ok: true, id: Number(ins.rows[0].id) })
})

app.patch('/api/posts/:id/like', auth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id' })
  await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id])
  res.json({ ok: true })
})

initDb()
  .then(() => app.listen(port, () => console.log(`Auth API on :${port}`)))
  .catch((e) => {
    console.error('DB init failed', e)
    process.exit(1)
  })
