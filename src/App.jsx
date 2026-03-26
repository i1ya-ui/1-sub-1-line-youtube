import { useState, useEffect } from 'react'
import { loadUser, saveUser } from './auth/session.js'

function App() {
  const subs = 54
  const [user, setUser] = useState(() => loadUser())
  const [loginDraft, setLoginDraft] = useState('')
  const [authError, setAuthError] = useState('')
  const login = (name = `user_${subs}`) => {
    const safeName = (name || '').trim() || `user_${subs}`
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(safeName)) return setAuthError('Ник: 3-20 символов, латиница/цифры/_')
    const u = { id: Date.now(), name: safeName }
    setUser(u)
    saveUser(u)
    setAuthError('')
    setLoginDraft('')
  }
  const logout = () => {
    setUser(null)
    saveUser(null)
    setAuthError('')
  }
  const isAuth = Boolean(user)
  useEffect(() => { document.title = isAuth ? `1 Sub — @${user.name}` : '1 Sub 1 Line' }, [isAuth, user])

  const [theme, setTheme] = useState(0)
  const cycleTheme = () => setTheme((t) => (t + 1) % 3)
  const themeName = ['Тёмная', 'Светлая', 'Матрица'][theme]

  const [posts, setPosts] = useState([
    { id: 1, text: 'Первый пост в соцсети!', likes: 0, author: 'user_1', date: '20.03' },
    { id: 2, text: 'Кто тут?', likes: 0, author: 'random_dev', date: '19.03' },
    { id: 3, text: 'Подписывайтесь!', likes: 0, author: 'user_1', date: '18.03' },
  ])
  const likePost = (id) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)))

  const [profiles] = useState([
    { id: 1, name: 'user_1', avatar: '🦊', bio: 'Лис в сети' },
    { id: 2, name: 'random_dev', avatar: '🐱', bio: 'Код и кофе' },
  ])

  const [chat, setChat] = useState(['Привет, стрим!'])
  const sendChat = () =>
    isAuth && setChat((c) => [...c, `@${user.name}: сообщение #${c.length + 1}`].slice(-10))

  const [dms, setDms] = useState([])
  const addDM = () =>
    isAuth && setDms((d) => [...d, `ЛС от @${user.name} #${d.length + 1}`].slice(-5))

  const [commentDraft, setCommentDraft] = useState('')
  const addCommentAsPost = () => {
    if (!isAuth || !commentDraft.trim()) return
    setPosts((p) => [
      { id: p.length + 1, text: commentDraft.trim(), likes: 0, author: user.name, date: 'сейчас' },
      ...p,
    ])
    setCommentDraft('')
  }

  const bgStyle =
    theme === 0
      ? 'linear-gradient(135deg,#1a0a2e 0%,#16213e 50%,#0f3460 100%)'
      : theme === 1
        ? '#f5f5f5'
        : 'linear-gradient(180deg,#003300 0%,#000 50%)'
  const colorStyle = theme === 2 ? '#00ff00' : theme === 1 ? '#111' : '#00f6ff'

  return (
    <div
      style={{
        background: bgStyle,
        color: colorStyle,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 24,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', margin: 0 }}>1 Sub 1 Line</h1>
        {isAuth && (
          <span
            style={{
              background: '#22c55e',
              color: '#001b00',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.8rem',
            }}
          >
            @{user.name}
          </span>
        )}
        {!isAuth ? (
          <>
            <input placeholder="nickname" value={loginDraft} onChange={(e) => setLoginDraft(e.target.value)} style={{ padding: 6, minWidth: 120 }} />
            <button type="button" onClick={() => login(loginDraft)}>
              Войти
            </button>
            {authError && <small style={{ color: '#ff8a8a', width: '100%' }}>{authError}</small>}
          </>
        ) : (
          <button type="button" onClick={logout}>
            Выйти
          </button>
        )}
        <button type="button" onClick={cycleTheme}>
          {themeName}
        </button>
      </header>

      <p style={{ margin: 0, opacity: 0.85, width: '100%' }}>
        1 подписчик = 1 строка кода · подписчиков: {subs} · вход сохраняется в localStorage
      </p>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Лента</h2>
        {posts.map((p) => (
          <article
            key={p.id}
            style={{
              background: 'rgba(0,0,0,0.2)',
              padding: 12,
              marginBottom: 8,
              borderRadius: 8,
            }}
          >
            <small>
              {p.author} · {p.date}
            </small>
            <p style={{ margin: '6px 0' }}>{p.text}</p>
            <button type="button" onClick={() => likePost(p.id)}>
              ❤️ {p.likes}
            </button>
          </article>
        ))}
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Профили</h2>
        {profiles.map((p) => (
          <div
            key={p.id}
            style={{
              background: 'rgba(0,0,0,0.2)',
              padding: 12,
              marginBottom: 8,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: '1.25em' }}>{p.avatar}</span>{' '}
            <span>{p.name}</span>
            <p style={{ fontSize: '0.9em', opacity: 0.85, margin: '4px 0 0' }}>{p.bio}</p>
          </div>
        ))}
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Чат</h2>
        <div
          style={{
            maxHeight: 140,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.2)',
            padding: 8,
            borderRadius: 8,
          }}
        >
          {chat.map((c, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {c}
            </div>
          ))}
        </div>
        <button type="button" onClick={sendChat} disabled={!isAuth} style={{ marginTop: 8 }}>
          Отправить в чат
        </button>
      </section>

      <section style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>ЛС</h2>
        <button type="button" onClick={addDM} disabled={!isAuth}>
          Новое ЛС ({dms.length})
        </button>
        {dms.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {dms.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </section>

      {!isAuth && (
        <p style={{ opacity: 0.85, margin: 0, width: '100%' }}>
          Войдите, чтобы писать в чат, в ЛС и публиковать пост.
        </p>
      )}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          placeholder="Новый пост (после входа)"
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          disabled={!isAuth}
          style={{ padding: 8 }}
        />
        <button type="button" onClick={addCommentAsPost} disabled={!isAuth || !commentDraft.trim()}>
          Опубликовать
        </button>
      </div>
    </div>
  )
}

export default App
