import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'

type UserRecord = { id: number; name: string; password: string }
type AuthResponse = { token: string; user: { id: number; name: string } }
type AuthRequest = Request & { user?: JwtPayload & { id: number; name: string } }

const app = express()
const port = Number(process.env.PORT || 3001)
const secret = process.env.JWT_SECRET || 'dev-secret'
const users = new Map<string, UserRecord>()

app.use(cors())
app.use(express.json())

const sign = (user: UserRecord): string =>
  jwt.sign({ id: user.id, name: user.name }, secret, { expiresIn: '7d' })

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

app.post('/api/auth/signup', (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const name = (req.body?.name as string | undefined)?.trim()
  const password = req.body?.password as string | undefined
  if (!name || !password || password.length < 4) return res.status(400).json({ error: 'Bad credentials' })
  if (users.has(name)) return res.status(409).json({ error: 'User exists' })
  const user: UserRecord = { id: Date.now(), name, password }
  users.set(name, user)
  return res.json({ token: sign(user), user: { id: user.id, name: user.name } })
})

app.post('/api/auth/login', (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const name = (req.body?.name as string | undefined)?.trim()
  const password = req.body?.password as string | undefined
  const user = name ? users.get(name) : null
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid login' })
  return res.json({ token: sign(user), user: { id: user.id, name: user.name } })
})

app.get('/api/auth/me', auth, (req: AuthRequest, res: Response) =>
  res.json({ user: { id: req.user?.id, name: req.user?.name } }),
)

app.listen(port, () => console.log(`Auth API on :${port}`))
