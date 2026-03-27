import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Pool } from 'pg'

type UserRecord = { id: number; name: string; password_hash: string }
type AuthResponse = { token: string; user: { id: number; name: string } }
type AuthRequest = Request & { user?: JwtPayload & { id: number; name: string } }

const app = express()
const port = Number(process.env.PORT || 3001)
const secret = process.env.JWT_SECRET || 'dev-secret'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

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

initDb()
  .then(() => app.listen(port, () => console.log(`Auth API on :${port}`)))
  .catch((e) => {
    console.error('DB init failed', e)
    process.exit(1)
  })
