import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Pool } from 'pg'

type UserRecord = { id: number; name: string; password_hash: string }
type AuthResponse = { token: string; user: { id: number; name: string; profilePoints: number } }
type AuthRequest = Request & { user?: JwtPayload & { id: number; name: string } }

const app = express()
app.disable('x-powered-by')
const port = Number(process.env.PORT || 3001)
const secret = process.env.JWT_SECRET || 'dev-secret'
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const MAX_POST_BODY = 2000
const MAX_COMMENT_BODY = 500
const MAX_BIO = 280
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/
/** Очки профиля: регистрация и действия на сайте */
const POINTS_SIGNUP = 50
const POINTS_NEW_POST = 15
const POINTS_COMMENT = 5
const POINTS_LIKE_GIVEN = 2

async function addProfilePoints(userId: number, delta: number) {
  if (!delta) return
  await pool.query('UPDATE users SET profile_points = profile_points + $1 WHERE id = $2', [delta, userId])
}

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
  await pool.query('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id)')
  await pool.query(
    'CREATE TABLE IF NOT EXISTS post_likes (user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY (user_id, post_id))',
  )
  await pool.query('CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id)')
  await pool.query(
    'CREATE TABLE IF NOT EXISTS comments (id BIGSERIAL PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
  )
  await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at DESC)')
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''")
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_points INT NOT NULL DEFAULT 0')
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
    'INSERT INTO users (name, password_hash, profile_points) VALUES ($1, $2, $3) RETURNING id, name, password_hash',
    [name, password_hash, POINTS_SIGNUP],
  )
  const user = created.rows[0]
  return res.json({ token: sign(user), user: { id: user.id, name: user.name, profilePoints: POINTS_SIGNUP } })
})

app.post('/api/auth/login', async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const name = (req.body?.name as string | undefined)?.trim()
  const password = req.body?.password as string | undefined
  if (name && !NAME_RE.test(name)) return res.status(400).json({ error: 'Bad name' })
  type LoginRow = UserRecord & { profile_points: number }
  const found = name ? await pool.query<LoginRow>('SELECT id, name, password_hash, profile_points FROM users WHERE name = $1', [name]) : null
  const user = found?.rows[0]
  if (!user || !password) return res.status(401).json({ error: 'Invalid login' })
  const ok = verifyPassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid login' })
  const profilePoints = Number(user.profile_points) || 0
  return res.json({ token: sign(user), user: { id: user.id, name: user.name, profilePoints } })
})

app.get('/api/auth/me', auth, async (req: AuthRequest, res: Response) => {
  const r = await pool.query<{ id: number; name: string; bio: string; profile_points: number }>(
    'SELECT id, name, bio, profile_points FROM users WHERE id = $1',
    [req.user!.id],
  )
  const u = r.rows[0]
  if (!u) return res.status(401).json({ error: 'User gone' })
  res.json({ user: { id: u.id, name: u.name, bio: u.bio, profilePoints: Number(u.profile_points) || 0 } })
})

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: true })
  } catch {
    res.status(503).json({ ok: false, db: false })
  }
})

app.get('/api/users', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30
  const r = await pool.query<{ id: number; name: string; bio: string; posts_count: number; profile_points: number }>(
    `SELECT u.id, u.name, u.bio, u.profile_points, COUNT(p.id)::int AS posts_count
     FROM users u
     LEFT JOIN posts p ON p.user_id = u.id
     GROUP BY u.id, u.name, u.bio, u.profile_points
     ORDER BY u.created_at DESC
     LIMIT $1`,
    [limit],
  )
  return res.json({
    users: r.rows.map((u) => ({
      id: Number(u.id),
      name: u.name,
      bio: u.bio ?? '',
      postsCount: Number(u.posts_count) || 0,
      profilePoints: Number(u.profile_points) || 0,
    })),
  })
})

/** Сортировка по очкам; должен быть выше `/api/users/:name`, иначе `ranking` сочтётся именем. */
app.get('/api/users/ranking', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const r = await pool.query<{ id: number; name: string; bio: string; posts_count: number; profile_points: number }>(
    `SELECT u.id, u.name, u.bio, u.profile_points, COUNT(p.id)::int AS posts_count
     FROM users u
     LEFT JOIN posts p ON p.user_id = u.id
     GROUP BY u.id, u.name, u.bio, u.profile_points
     ORDER BY u.profile_points DESC, u.name ASC
     LIMIT $1`,
    [limit],
  )
  const base = r.rows.map((u) => ({
    id: Number(u.id),
    name: u.name,
    bio: u.bio ?? '',
    postsCount: Number(u.posts_count) || 0,
    profilePoints: Number(u.profile_points) || 0,
  }))
  let displayRank = 1
  const ranking = base.map((row, i) => {
    if (i > 0 && row.profilePoints < base[i - 1]!.profilePoints) displayRank = i + 1
    return { rank: displayRank, ...row }
  })
  return res.json({ ranking })
})

app.get('/api/users/:name', async (req: Request, res: Response) => {
  const name = (req.params.name as string | undefined)?.trim()
  if (!name) return res.status(400).json({ error: 'Bad name' })
  const r = await pool.query<{ id: number; name: string; bio: string; profile_points: number }>(
    'SELECT id, name, bio, profile_points FROM users WHERE name = $1',
    [name],
  )
  if (!r.rowCount) return res.status(404).json({ error: 'Not found' })
  const u = r.rows[0]
  return res.json({
    user: {
      id: u.id,
      name: u.name,
      bio: u.bio,
      profilePoints: Number(u.profile_points) || 0,
    },
  })
})

app.patch('/api/users/me', auth, async (req: AuthRequest, res: Response) => {
  const bio = typeof req.body?.bio === 'string' ? req.body.bio : ''
  if (bio.length > MAX_BIO) return res.status(400).json({ error: 'Too long' })
  const t = bio.trim()
  await pool.query('UPDATE users SET bio = $1 WHERE id = $2', [t, req.user!.id])
  const pts = await pool.query<{ profile_points: number }>('SELECT profile_points FROM users WHERE id = $1', [req.user!.id])
  const profilePoints = Number(pts.rows[0]?.profile_points) || 0
  res.json({ ok: true, user: { id: req.user!.id, name: req.user!.name, bio: t, profilePoints } })
})

app.get('/api/posts', async (req: Request, res: Response) => {
  let uid: number | null = null
  const raw = req.headers.authorization?.replace('Bearer ', '')
  if (raw) {
    try {
      const p = jwt.verify(raw, secret)
      if (typeof p !== 'string') uid = Number((p as JwtPayload & { id: number }).id) || null
    } catch {
      uid = null
    }
  }
  const mineRaw = req.query.mine
  const mine = mineRaw === '1' || mineRaw === 'true'
  if (mine && uid == null) return res.status(401).json({ error: 'Auth required' })

  const authorRaw = typeof req.query.author === 'string' ? req.query.author.trim() : ''
  const author = authorRaw || null
  if (author && !NAME_RE.test(author)) return res.status(400).json({ error: 'Bad author' })

  const fromRaw = typeof req.query.from === 'string' ? req.query.from.trim() : ''
  const toRaw = typeof req.query.to === 'string' ? req.query.to.trim() : ''
  let fromTs: Date | null = null
  let toTs: Date | null = null
  if (fromRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw)) return res.status(400).json({ error: 'Bad from date' })
    fromTs = new Date(`${fromRaw}T00:00:00.000Z`)
    if (Number.isNaN(fromTs.getTime())) return res.status(400).json({ error: 'Bad from date' })
  }
  if (toRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) return res.status(400).json({ error: 'Bad to date' })
    toTs = new Date(`${toRaw}T23:59:59.999Z`)
    if (Number.isNaN(toTs.getTime())) return res.status(400).json({ error: 'Bad to date' })
  }
  if (fromTs && toTs && fromTs.getTime() > toTs.getTime()) return res.status(400).json({ error: 'from after to' })

  const qparams: unknown[] = [uid]
  const whereParts: string[] = []
  let qi = 2
  if (author) {
    whereParts.push(`u.name = $${qi++}`)
    qparams.push(author)
  }
  if (fromTs) {
    whereParts.push(`p.created_at >= $${qi++}`)
    qparams.push(fromTs)
  }
  if (toTs) {
    whereParts.push(`p.created_at <= $${qi++}`)
    qparams.push(toTs)
  }
  if (mine) {
    whereParts.push(`p.user_id = $${qi++}`)
    qparams.push(uid)
  }
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

  const r = await pool.query(
    `SELECT p.id, p.body, u.name, p.created_at, p.likes,
      (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
      CASE WHEN $1::bigint IS NULL THEN false ELSE EXISTS (
        SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
      ) END AS liked,
      COALESCE(com.j, '[]'::json) AS comments
     FROM posts p JOIN users u ON u.id = p.user_id
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'id', ci.id,
           'author', u2.name,
           'text', ci.body,
           'userId', ci.user_id,
           'createdAt', ci.created_at
         )
         ORDER BY ci.created_at ASC
       ) AS j
       FROM (SELECT * FROM comments WHERE post_id = p.id ORDER BY created_at DESC LIMIT 12) ci
       JOIN users u2 ON u2.id = ci.user_id
     ) com ON true
     ${whereSql}
     ORDER BY p.created_at DESC LIMIT 50`,
    qparams,
  )
  res.json({
    posts: r.rows.map((x) => ({
      id: Number(x.id),
      text: x.body,
      author: x.name,
      date: x.created_at.toISOString().slice(5, 10),
      likes: Number(x.likes) || 0,
      commentCount: Number(x.comment_count) || 0,
      liked: Boolean(x.liked),
      comments: Array.isArray(x.comments) ? x.comments : [],
    })),
  })
})

app.post('/api/posts', auth, async (req: AuthRequest, res: Response) => {
  const body = (req.body?.body as string | undefined)?.trim()
  if (!body) return res.status(400).json({ error: 'Empty' })
  if (body.length > MAX_POST_BODY) return res.status(400).json({ error: 'Too long' })
  const ins = await pool.query<{ id: string }>(
    'INSERT INTO posts (user_id, body) VALUES ($1, $2) RETURNING id',
    [req.user!.id, body],
  )
  await addProfilePoints(req.user!.id, POINTS_NEW_POST)
  res.json({ ok: true, id: Number(ins.rows[0].id) })
})

app.patch('/api/posts/:id/like', auth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id' })
  const ins = await pool.query(
    'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
    [req.user!.id, id],
  )
  if (ins.rowCount) {
    await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id])
    await addProfilePoints(req.user!.id, POINTS_LIKE_GIVEN)
  }
  res.json({ ok: true, liked: Boolean(ins.rowCount) })
})

app.post('/api/posts/:id/comments', auth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id' })
  const body = (req.body?.body as string | undefined)?.trim()
  if (!body) return res.status(400).json({ error: 'Empty' })
  if (body.length > MAX_COMMENT_BODY) return res.status(400).json({ error: 'Too long' })
  const ex = await pool.query('SELECT 1 FROM posts WHERE id = $1', [id])
  if (!ex.rowCount) return res.status(404).json({ error: 'Not found' })
  await pool.query('INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3)', [id, req.user!.id, body])
  await addProfilePoints(req.user!.id, POINTS_COMMENT)
  res.json({ ok: true })
})

app.delete('/api/posts/:postId/comments/:id', auth, async (req: AuthRequest, res: Response) => {
  const pid = Number(req.params.postId)
  const cid = Number(req.params.id)
  if (!Number.isFinite(pid) || !Number.isFinite(cid)) return res.status(400).json({ error: 'Bad id' })
  const r = await pool.query('DELETE FROM comments WHERE id = $1 AND post_id = $2 AND user_id = $3 RETURNING 1', [
    cid,
    pid,
    req.user!.id,
  ])
  if (!r.rowCount) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

initDb()
  .then(() => app.listen(port, () => console.log(`Auth API on :${port}`)))
  .catch((e) => {
    console.error('DB init failed', e)
    process.exit(1)
  })
