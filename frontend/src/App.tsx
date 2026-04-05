import { useCallback, useEffect, useState } from 'react'
import { get, patch, post } from './api/client'
import { MAX_COMMENT_BODY, MAX_POST_BODY } from './constants'
import { loadSession, saveSession } from './auth/session'
import type { Session } from './types'

type AuthMode = 'login' | 'signup'
type AuthResponse = Session
type Cmt = { id: number; author: string; text: string }
type PostItem = { id: number; text: string; likes: number; author: string; date: string; liked?: boolean; comments?: Cmt[] }
type Profile = { id: number; name: string; avatar: string; bio: string }

function App() {
  const subs = 82
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)
  const user = session?.user || null
  const token = session?.token || null

  const authSubmit = async () => {
    setAuthError('')
    setLoadingAuth(true)
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup'
      const next = await post<AuthResponse>(endpoint, { name, password })
      setSession(next)
      saveSession(next)
      setName('')
      setPassword('')
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Auth error')
    } finally {
      setLoadingAuth(false)
    }
  }

  const logout = () => {
    setSession(null)
    saveSession(null)
  }

  const isAuth = Boolean(user)
  useEffect(() => {
    document.title = isAuth ? `1 Sub — @${user?.name}` : '1 Sub 1 Line'
  }, [isAuth, user?.name])

  useEffect(() => {
    if (!token) return
    get<{ user: { id: number; name: string } }>('/auth/me', token).catch(() => {
      setSession(null)
      saveSession(null)
    })
  }, [token])

  const [postsLoading, setPostsLoading] = useState(true)
  const [postsFetchError, setPostsFetchError] = useState('')
  const fetchFeed = useCallback((opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent)
    if (!silent) {
      setPostsLoading(true)
      setPostsFetchError('')
    }
    get<{ posts: PostItem[] }>('/posts', token ?? undefined)
      .then((d) => setPosts(d.posts))
      .catch(() => {
        if (!silent) setPostsFetchError('Не удалось загрузить ленту')
      })
      .finally(() => {
        if (!silent) setPostsLoading(false)
      })
  }, [token])
  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      fetchFeed({ silent: true })
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [fetchFeed])

  const [theme, setTheme] = useState(0)
  const cycleTheme = () => setTheme((t) => (t + 1) % 3)
  const themeName = ['Тёмная', 'Светлая', 'Матрица'][theme]

  const [posts, setPosts] = useState<PostItem[]>([
    { id: 1, text: 'Первый пост в соцсети!', likes: 0, author: 'user_1', date: '20.03' },
    { id: 2, text: 'Кто тут?', likes: 0, author: 'random_dev', date: '19.03' },
    { id: 3, text: 'Подписывайтесь!', likes: 0, author: 'user_1', date: '18.03' },
  ])
  const [cText, setCText] = useState<Record<number, string>>({})
  const sendComment = async (postId: number) => {
    const t = (cText[postId] || '').trim()
    if (!token || !t || t.length > MAX_COMMENT_BODY) return
    try {
      await post(`/posts/${postId}/comments`, { body: t }, token)
      setCText((m) => ({ ...m, [postId]: '' }))
      setPosts((await get<{ posts: PostItem[] }>('/posts', token)).posts)
    } catch {
      /* noop */
    }
  }

  const likePost = async (id: number, already: boolean) => {
    if (already) return
    if (!token) {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)))
      return
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1, liked: true } : p)))
    try {
      const r = await patch<{ ok: boolean; liked: boolean }>('/posts/' + id + '/like', {}, token)
      if (!r.liked) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes - 1), liked: false } : p)))
        return
      }
      setPosts((await get<{ posts: PostItem[] }>('/posts', token)).posts)
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes - 1), liked: false } : p)))
    }
  }

  const [profiles] = useState<Profile[]>([
    { id: 1, name: 'user_1', avatar: '🦊', bio: 'Лис в сети' },
    { id: 2, name: 'random_dev', avatar: '🐱', bio: 'Код и кофе' },
  ])

  const [chat, setChat] = useState<string[]>(['Привет, стрим!'])
  const sendChat = () => isAuth && setChat((c) => [...c, `@${user?.name}: сообщение #${c.length + 1}`].slice(-10))

  const [dms, setDms] = useState<string[]>([])
  const addDM = () => isAuth && setDms((d) => [...d, `ЛС от @${user?.name} #${d.length + 1}`].slice(-5))

  const [commentDraft, setCommentDraft] = useState('')
  const [postError, setPostError] = useState('')
  const [posting, setPosting] = useState(false)
  useEffect(() => {
    setPostError('')
  }, [commentDraft])
  const addCommentAsPost = async () => {
    if (!isAuth || !commentDraft.trim() || !token) return
    if (commentDraft.trim().length > MAX_POST_BODY) return
    setPostError('')
    setPosting(true)
    try {
      await post('/posts', { body: commentDraft.trim() }, token)
      setPosts((await get<{ posts: PostItem[] }>('/posts', token)).posts)
      setCommentDraft('')
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Ошибка публикации')
    } finally {
      setPosting(false)
    }
  }

  const bgStyle =
    theme === 0
      ? 'linear-gradient(135deg,#1a0a2e 0%,#16213e 50%,#0f3460 100%)'
      : theme === 1
        ? '#f5f5f5'
        : 'linear-gradient(180deg,#003300 0%,#000 50%)'
  const colorStyle = theme === 2 ? '#00ff00' : theme === 1 ? '#111' : '#00f6ff'

  return (
    <div style={{ background: bgStyle, color: colorStyle, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.35rem', margin: 0 }}>1 Sub 1 Line</h1>
        {isAuth && <span style={{ background: '#22c55e', color: '#001b00', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>@{user?.name}</span>}
        {isAuth ? <button type="button" onClick={logout}>Выйти</button> : null}
        <button type="button" onClick={cycleTheme}>{themeName}</button>
      </header>

      <p style={{ margin: 0, opacity: 0.85, width: '100%' }}>1 подписчик = 1 строка кода · подписчиков: {subs} · вход сохраняется в localStorage</p>
      {!isAuth && (
        <section style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAuthMode('login')} disabled={authMode === 'login'}>Login</button>
            <button type="button" onClick={() => setAuthMode('signup')} disabled={authMode === 'signup'}>Signup</button>
          </div>
          <input autoComplete="username" placeholder="username" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8 }} />
          <input autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 8 }} />
          <button type="button" onClick={authSubmit} disabled={loadingAuth || !name.trim() || password.length < 4}>
            {loadingAuth ? '...' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
          {authError && <small style={{ color: '#ff8a8a' }}>{authError}</small>}
        </section>
      )}

      {postsLoading ? <p style={{ margin: 0, opacity: 0.85, width: '100%' }}>Загрузка ленты…</p> : null}
      {postsFetchError ? (
        <div role="alert" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <small style={{ color: '#ff8a8a' }}>{postsFetchError}</small>
          <button type="button" onClick={() => fetchFeed()}>Повторить</button>
        </div>
      ) : null}
      <section style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Лента</h2>
          <button type="button" onClick={() => fetchFeed()} disabled={postsLoading} aria-busy={postsLoading}>
            Обновить
          </button>
        </div>
        {posts.map((p) => (
          <article key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}>
            <small>{p.author} · {p.date}</small>
            <p style={{ margin: '6px 0' }}>{p.text}</p>
            <button type="button" onClick={() => likePost(p.id, Boolean(p.liked))} disabled={isAuth && Boolean(p.liked)}>
              {p.liked ? '❤️' : '🤍'} {p.likes}
            </button>
            {(p.comments ?? []).map((c) => (
              <div key={c.id} style={{ fontSize: '0.85em', marginTop: 4, opacity: 0.92 }}><b>@{c.author}</b> {c.text}</div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input placeholder="Комментарий" value={cText[p.id] || ''} maxLength={MAX_COMMENT_BODY} onChange={(e) => setCText((m) => ({ ...m, [p.id]: e.target.value }))} disabled={!isAuth} style={{ flex: 1, padding: 6 }} />
              <button type="button" onClick={() => void sendComment(p.id)} disabled={!isAuth || !(cText[p.id] || '').trim()}>Ок</button>
            </div>
          </article>
        ))}
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Профили</h2>
        {profiles.map((p) => (
          <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}>
            <span style={{ fontSize: '1.25em' }}>{p.avatar}</span> <span>{p.name}</span>
            <p style={{ fontSize: '0.9em', opacity: 0.85, margin: '4px 0 0' }}>{p.bio}</p>
          </div>
        ))}
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Чат</h2>
        <div style={{ maxHeight: 140, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8 }}>
          {chat.map((c, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{c}</div>
          ))}
        </div>
        <button type="button" onClick={sendChat} disabled={!isAuth} style={{ marginTop: 8 }}>Отправить в чат</button>
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>ЛС</h2>
        <button type="button" onClick={addDM} disabled={!isAuth}>Новое ЛС ({dms.length})</button>
        {dms.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {dms.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </section>

      {!isAuth && <p style={{ opacity: 0.85, margin: 0, width: '100%' }}>Войдите, чтобы писать в чат, в ЛС и публиковать пост.</p>}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Новый пост (после входа)" value={commentDraft} maxLength={MAX_POST_BODY} title="Ctrl+Enter или ⌘+Enter — опубликовать" onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void addCommentAsPost() } }} disabled={!isAuth} readOnly={posting} aria-busy={posting} style={{ padding: 8 }} />
        <small style={{ opacity: 0.75 }}>{commentDraft.length}/{MAX_POST_BODY}</small>
        {postError ? <small style={{ color: '#ff8a8a' }}>{postError}</small> : null}
        <button type="button" onClick={addCommentAsPost} disabled={!isAuth || !commentDraft.trim() || commentDraft.trim().length > MAX_POST_BODY || posting} aria-busy={posting}>{posting ? '...' : 'Опубликовать'}</button>
      </div>
    </div>
  )
}

export default App
