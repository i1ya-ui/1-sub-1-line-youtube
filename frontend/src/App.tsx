import { useCallback, useEffect, useRef, useState } from 'react'
import { del, get, patch, post } from './api/client'
import { MAX_BIO, MAX_COMMENT_BODY, MAX_POST_BODY } from './constants'
import { loadSession, saveSession } from './auth/session'
import type { Session } from './types'

type AuthMode = 'login' | 'signup'
type AuthResponse = Session
type Cmt = { id: number; author: string; text: string; userId?: number }
type PostItem = {
  id: number
  text: string
  likes: number
  author: string
  date: string
  liked?: boolean
  comments?: Cmt[]
  commentCount?: number
}
type Profile = { id: number; name: string; avatar: string; bio: string }

const PROFILE_SEED: Profile[] = [
  { id: 1, name: 'user_1', avatar: '🦊', bio: 'Лис в сети' },
  { id: 2, name: 'random_dev', avatar: '🐱', bio: 'Код и кофе' },
]

const THEME_KEY = '1sub1line_theme'

function readStoredTheme(): number {
  try {
    const n = Number(localStorage.getItem(THEME_KEY))
    return Number.isFinite(n) && n >= 0 && n < 3 ? n : 0
  } catch {
    return 0
  }
}

function App() {
  const subs = 96
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

  const [bioDraft, setBioDraft] = useState('')
  const [bioSaved, setBioSaved] = useState('')
  const [bioSaving, setBioSaving] = useState(false)
  useEffect(() => {
    if (!token) {
      setBioDraft('')
      return setBioSaved('')
    }
    get<{ user: { id: number; name: string; bio?: string } }>('/auth/me', token)
      .then((d) => {
        const b = d.user.bio ?? ''
        setBioDraft(b)
        setBioSaved(b)
      })
      .catch(() => {
        setSession(null)
        saveSession(null)
      })
  }, [token])
  const bioTrimmed = bioDraft.trim()
  const bioDirty = bioTrimmed !== bioSaved
  const saveBio = () => {
    if (!token || !user || !bioDirty) return
    setBioSaving(true)
    void patch<{ user: { bio: string } }>('/users/me', { bio: bioTrimmed }, token)
      .then((r) => {
        setBioDraft(r.user.bio)
        setBioSaved(r.user.bio)
        setProfiles((prev) => prev.map((p) => (p.name === user.name ? { ...p, bio: r.user.bio } : p)))
        showToast('Био сохранено')
      })
      .catch(() => showToast('Не удалось сохранить био'))
      .finally(() => setBioSaving(false))
  }

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

  const [theme, setTheme] = useState(readStoredTheme)
  useEffect(() => {
    localStorage.setItem(THEME_KEY, String(theme))
  }, [theme])
  const cycleTheme = () => setTheme((t) => (t + 1) % 3)
  const themeName = ['Тёмная', 'Светлая', 'Матрица'][theme]

  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const [toast, setToast] = useState<string | null>(null)
  const toastQueueRef = useRef<string[]>([])
  const toastMs = reduceMotion ? 2000 : 2500
  const showToast = useCallback((msg: string) => {
    setToast((prev) => {
      if (prev === null) return msg
      toastQueueRef.current.push(msg)
      return prev
    })
  }, [])
  useEffect(() => {
    if (toast !== null) {
      const t = window.setTimeout(() => setToast(null), toastMs)
      return () => window.clearTimeout(t)
    }
    const next = toastQueueRef.current.shift()
    if (next !== undefined) setToast(next)
  }, [toast, toastMs])
  const copyPostLink = (id: number) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${id}`
    void navigator.clipboard
      .writeText(url)
      .then(() => showToast('Ссылка скопирована'))
      .catch(() => showToast('Не удалось скопировать'))
  }

  const [posts, setPosts] = useState<PostItem[]>([
    { id: 1, text: 'Первый пост в соцсети!', likes: 0, author: 'user_1', date: '20.03' },
    { id: 2, text: 'Кто тут?', likes: 0, author: 'random_dev', date: '19.03' },
    { id: 3, text: 'Подписывайтесь!', likes: 0, author: 'user_1', date: '18.03' },
  ])
  useEffect(() => {
    if (postsLoading) return
    const m = /^#post-(\d+)$/.exec(window.location.hash)
    if (!m) return
    const el = document.getElementById(`post-${m[1]}`)
    if (el)
      window.setTimeout(
        () => el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }),
        80,
      )
  }, [postsLoading, posts, reduceMotion])
  const [cText, setCText] = useState<Record<number, string>>({})
  const [cErr, setCErr] = useState<Record<number, string>>({})
  const [delErr, setDelErr] = useState<Record<number, string>>({})
  const [cDeleting, setCDeleting] = useState<number | null>(null)
  const [cPosting, setCPosting] = useState<number | null>(null)
  const sendComment = async (postId: number) => {
    const t = (cText[postId] || '').trim()
    if (!token || !t || t.length > MAX_COMMENT_BODY) return
    setCErr((m) => ({ ...m, [postId]: '' }))
    setCPosting(postId)
    try {
      await post(`/posts/${postId}/comments`, { body: t }, token)
      setCText((m) => ({ ...m, [postId]: '' }))
      setPosts((await get<{ posts: PostItem[] }>('/posts', token)).posts)
    } catch (e) {
      setCErr((m) => ({ ...m, [postId]: e instanceof Error ? e.message : 'Не удалось отправить' }))
    } finally {
      setCPosting(null)
    }
  }

  const deleteComment = async (postId: number, commentId: number) => {
    if (!token) return
    if (!window.confirm('Удалить этот комментарий?')) return
    setDelErr((m) => ({ ...m, [postId]: '' }))
    setCDeleting(commentId)
    try {
      await del(`/posts/${postId}/comments/${commentId}`, token)
      setPosts((await get<{ posts: PostItem[] }>('/posts', token)).posts)
    } catch (e) {
      setDelErr((m) => ({ ...m, [postId]: e instanceof Error ? e.message : 'Не удалось удалить' }))
    } finally {
      setCDeleting(null)
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

  const [profiles, setProfiles] = useState<Profile[]>(PROFILE_SEED)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  useEffect(() => {
    void Promise.all(PROFILE_SEED.map((p) => get<{ user: { id: number; name: string; bio: string } }>(`/users/${encodeURIComponent(p.name)}`).catch(() => null))).then((rows) =>
      setProfiles(PROFILE_SEED.map((p, i) => { const u = rows[i]?.user; return u ? { id: u.id, name: u.name, avatar: p.avatar, bio: u.bio || p.bio } : p })),
    )
  }, [])
  useEffect(() => {
    if (!activeProfile) return
    const next = profiles.find((p) => p.id === activeProfile.id || p.name === activeProfile.name) || null
    setActiveProfile(next)
  }, [profiles, activeProfile])

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
  const toastSurface =
    theme === 1
      ? {
          background: 'rgba(255,255,255,0.96)',
          color: '#111',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
        }
      : theme === 2
        ? {
            background: 'rgba(0,24,0,0.94)',
            color: '#00ff00',
            border: '1px solid rgba(0,255,0,0.35)',
            boxShadow: '0 4px 24px rgba(0,80,0,0.45)',
          }
        : {
            background: 'rgba(0,0,0,0.88)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }

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

      {isAuth && (
        <section style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            placeholder="О себе"
            value={bioDraft}
            maxLength={MAX_BIO}
            title="Ctrl+Enter или ⌘+Enter — сохранить, Esc — откатить"
            onChange={(e) => setBioDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBioDraft(bioSaved)
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                saveBio()
              }
            }}
            rows={2}
            style={{
              padding: 6,
              resize: 'vertical',
              boxSizing: 'border-box',
              width: '100%',
              borderRadius: 6,
              border: bioDirty
                ? '2px solid #f59e0b'
                : theme === 1
                  ? '1px solid rgba(0,0,0,0.15)'
                  : '1px solid rgba(255,255,255,0.15)',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={saveBio} disabled={bioSaving || !bioDirty} aria-busy={bioSaving}>{bioSaving ? '...' : bioDirty ? 'Сохранить био' : 'Без изменений'}</button>
            <button type="button" onClick={() => setBioDraft(bioSaved)} disabled={bioSaving || !bioDirty}>Отменить</button>
            <small style={{ opacity: 0.75 }}>{bioDraft.length}/{MAX_BIO}</small>
          </div>
          {bioDirty ? <small role="status" aria-live="polite" style={{ opacity: 0.9, color: theme === 1 ? '#b45309' : '#fbbf24' }}>Есть несохранённые изменения</small> : null}
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
          <article key={p.id} id={`post-${p.id}`} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}>
            <small>{p.author} · {p.date} · 💬 {p.commentCount ?? (p.comments?.length ?? 0)}</small>
            <p style={{ margin: '6px 0' }}>{p.text}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => likePost(p.id, Boolean(p.liked))} disabled={isAuth && Boolean(p.liked)}>
                {p.liked ? '❤️' : '🤍'} {p.likes}
              </button>
              <button type="button" title="Скопировать ссылку на пост" onClick={() => copyPostLink(p.id)}>Ссылка</button>
            </div>
            {(p.comments ?? []).map((c) => (
              <div key={c.id} style={{ fontSize: '0.85em', marginTop: 4, opacity: 0.92, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 }}>
                <span><b>@{c.author}</b> {c.text}</span>
                {isAuth &&
                (c.userId != null ? Number(user?.id) === Number(c.userId) : user?.name === c.author) ? (
                  <button type="button" onClick={() => void deleteComment(p.id, c.id)} disabled={cDeleting === c.id} aria-busy={cDeleting === c.id} style={{ fontSize: '0.85em', padding: '2px 6px' }}>{cDeleting === c.id ? '…' : 'Удалить'}</button>
                ) : null}
              </div>
            ))}
            {delErr[p.id] ? <small style={{ color: '#ff8a8a' }}>{delErr[p.id]}</small> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea placeholder="Комментарий (Ctrl+Enter — отправить)" value={cText[p.id] || ''} maxLength={MAX_COMMENT_BODY} title="Ctrl+Enter или ⌘+Enter — отправить" readOnly={cPosting === p.id} rows={2} onChange={(e) => { setCText((m) => ({ ...m, [p.id]: e.target.value })); setCErr((m) => ({ ...m, [p.id]: '' })); setDelErr((m) => ({ ...m, [p.id]: '' })) }} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void sendComment(p.id) } }} disabled={!isAuth} style={{ flex: 1, padding: 6, minHeight: 48, resize: 'vertical', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => void sendComment(p.id)} disabled={!isAuth || !(cText[p.id] || '').trim() || cPosting === p.id} aria-busy={cPosting === p.id}>{cPosting === p.id ? '...' : 'Ок'}</button>
              </div>
              <small style={{ opacity: 0.75 }}>{(cText[p.id] || '').length}/{MAX_COMMENT_BODY}</small>
              {cErr[p.id] ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <small style={{ color: '#ff8a8a' }}>{cErr[p.id]}</small>
                  <button type="button" onClick={() => void sendComment(p.id)} disabled={cPosting === p.id || !(cText[p.id] || '').trim()}>Повторить</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Профили</h2>
        {profiles.map((p) => (
          <button type="button" key={p.id} onClick={() => setActiveProfile(p)} style={{ width: '100%', textAlign: 'left', background: activeProfile?.id === p.id ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.2)', color: 'inherit', border: activeProfile?.id === p.id ? '1px solid rgba(245,158,11,0.9)' : '1px solid transparent', padding: 12, marginBottom: 8, borderRadius: 8 }}>
            <span style={{ fontSize: '1.25em' }}>{p.avatar}</span> <span>{p.name}</span>
            <p style={{ fontSize: '0.9em', opacity: 0.85, margin: '4px 0 0' }}>{p.bio}</p>
          </button>
        ))}
        {activeProfile && (
          <article style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 12 }}>
            <h3 style={{ margin: '0 0 6px' }}>Профиль @{activeProfile.name}</h3>
            <p style={{ margin: '0 0 6px', opacity: 0.9 }}>ID: {activeProfile.id}</p>
            <p style={{ margin: 0 }}>{activeProfile.bio || 'Пока без био'}</p>
          </article>
        )}
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
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: '0.9rem',
            zIndex: 50,
            maxWidth: 'min(420px, 92vw)',
            ...toastSurface,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}

export default App
