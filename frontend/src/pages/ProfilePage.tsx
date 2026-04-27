import { useEffect, useMemo, useState } from 'react'
import { get } from '../api/client'

type Profile = { id: number; name: string; bio: string }
type PostComment = { id: number; author: string; text: string }
type PostItem = {
  id: number
  text: string
  author: string
  date: string
  likes: number
  comments?: PostComment[]
}

type Props = {
  name: string
  onBack: () => void
  token?: string | null
}

function ProfilePage({ name, onBack, token }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    void Promise.all([
      get<{ user: Profile }>(`/users/${encodeURIComponent(name)}`),
      get<{ posts: PostItem[] }>('/posts', token ?? undefined),
    ])
      .then(([u, p]) => {
        setProfile(u.user)
        setPosts(p.posts)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить профиль'))
      .finally(() => setLoading(false))
  }, [name, token])

  const authored = useMemo(() => posts.filter((p) => p.author === name).slice(0, 20), [posts, name])
  const commentsCount = useMemo(
    () => posts.reduce((acc, p) => acc + (p.comments ?? []).filter((c) => c.author === name).length, 0),
    [posts, name],
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 12, padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem' }}>Профиль @{name}</h1>
        <button type="button" onClick={onBack}>Назад</button>
      </header>
      {loading ? <p style={{ margin: 0 }}>Загрузка профиля…</p> : null}
      {error ? <p role="alert" style={{ margin: 0, color: '#ff8a8a' }}>{error}</p> : null}
      {profile ? (
        <section style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 12 }}>
          <p style={{ margin: '0 0 6px' }}>ID: {profile.id}</p>
          <p style={{ margin: '0 0 6px' }}>Постов в ленте: {authored.length}</p>
          <p style={{ margin: '0 0 6px' }}>Комментариев в ленте: {commentsCount}</p>
          <p style={{ margin: 0 }}>{profile.bio || 'Пока без био'}</p>
        </section>
      ) : null}
      <section>
        <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>Посты автора</h2>
        {authored.length === 0 ? <p style={{ margin: 0, opacity: 0.8 }}>Пока нет постов в текущей ленте.</p> : null}
        {authored.map((p) => (
          <article key={p.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <small>{p.date} · ❤️ {p.likes}</small>
            <p style={{ margin: '6px 0 0' }}>{p.text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default ProfilePage
