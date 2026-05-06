import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get } from '../api/client'
import postCard from '../components/PostCardLayout.module.css'
import { Button, Card, PageContainer, Section } from '../components/ui'
import { loadSession } from '../auth/session'
import type { PostItem, Profile } from '../types'
import styles from './ProfilePage.module.css'

function ProfilePage() {
  const params = useParams()
  const navigate = useNavigate()
  const name = decodeURIComponent(params.name || '')
  const token = loadSession()?.token ?? null
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
    <PageContainer>
      <Card>
        <header className={styles.headerRow}>
          <h1 className={styles.title}>Профиль @{name}</h1>
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            Назад
          </Button>
        </header>
      </Card>
      {loading ? <p className={styles.meta}>Загрузка профиля…</p> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {profile ? (
        <Card>
          <p className={styles.meta}>ID: {profile.id}</p>
          <p className={styles.meta}>Постов в ленте: {authored.length}</p>
          <p className={styles.meta}>Комментариев в ленте: {commentsCount}</p>
          <p>{profile.bio || 'Пока без био'}</p>
        </Card>
      ) : null}
      <Section title="Посты автора">
        {authored.length === 0 ? <p className={styles.meta}>Пока нет постов в текущей ленте.</p> : null}
        <div className={styles.postFeed}>
          {authored.map((p) => (
            <article key={p.id} className={postCard.article}>
              <header className={postCard.header}>
                <div className={postCard.meta}>
                  <time dateTime={p.date}>{p.date}</time>
                  <span className={postCard.chip}>❤️ {p.likes}</span>
                </div>
              </header>
              <p className={postCard.body}>{p.text}</p>
            </article>
          ))}
        </div>
      </Section>
    </PageContainer>
  )
}

export default ProfilePage
