import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { del, get, patch, post } from '../api/client'
import { loadSession, saveSession } from '../auth/session'
import AuthorLink from '../components/AuthorLink'
import postCard from '../components/PostCardLayout.module.css'
import { Badge, Button, Card, Input, Modal, Section, Textarea } from '../components/ui'
import { MAX_BIO, MAX_COMMENT_BODY, MAX_POST_BODY } from '../constants'
import { formatCommentTime } from '../shared/formatCommentTime'
import type { PostItem, Profile, Session } from '../types'
import styles from './FeedPage.module.css'

type AuthMode = 'login' | 'signup'
type AuthResponse = Session

const TOAST_MS = 2200

function FeedPage() {
  const subs = 97
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)
  const user = session?.user || null
  const token = session?.token || null
  const isAuth = Boolean(user)

  const [bioDraft, setBioDraft] = useState('')
  const [bioSaved, setBioSaved] = useState('')
  const [bioSaving, setBioSaving] = useState(false)

  const [posts, setPosts] = useState<PostItem[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsFetchError, setPostsFetchError] = useState('')

  const [commentDraft, setCommentDraft] = useState('')
  const [postError, setPostError] = useState('')
  const [posting, setPosting] = useState(false)

  const [cText, setCText] = useState<Record<number, string>>({})
  const [cErr, setCErr] = useState<Record<number, string>>({})
  const [delErr, setDelErr] = useState<Record<number, string>>({})
  const [cDeleting, setCDeleting] = useState<number | null>(null)
  const [cPosting, setCPosting] = useState<number | null>(null)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState('')
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [newPostOpen, setNewPostOpen] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const toastQueueRef = useRef<string[]>([])
  const showToast = useCallback((msg: string) => {
    setToast((prev) => {
      if (prev === null) return msg
      toastQueueRef.current.push(msg)
      return prev
    })
  }, [])

  useEffect(() => {
    if (toast !== null) {
      const t = window.setTimeout(() => setToast(null), TOAST_MS)
      return () => window.clearTimeout(t)
    }
    const next = toastQueueRef.current.shift()
    if (next !== undefined) setToast(next)
  }, [toast])

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

  useEffect(() => {
    document.title = isAuth ? `1 Sub — @${user?.name}` : '1 Sub 1 Line'
  }, [isAuth, user?.name])

  useEffect(() => {
    if (!token) {
      setBioDraft('')
      setBioSaved('')
      return
    }
    get<{ user: { bio?: string } }>('/auth/me', token)
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

  const fetchFeed = useCallback(() => {
    setPostsLoading(true)
    setPostsFetchError('')
    get<{ posts: PostItem[] }>('/posts', token ?? undefined)
      .then((d) => setPosts(d.posts))
      .catch(() => setPostsFetchError('Не удалось загрузить ленту'))
      .finally(() => setPostsLoading(false))
  }, [token])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    setProfilesLoading(true)
    setProfilesError('')
    get<{ users: Array<{ id: number; name: string; bio: string; postsCount?: number }> }>('/users')
      .then((d) => {
        setProfiles(
          d.users.map((u) => ({
            id: u.id,
            name: u.name,
            bio: u.bio || 'Пока без био',
            postsCount: u.postsCount ?? 0,
          })),
        )
      })
      .catch(() => {
        setProfilesError('Не удалось загрузить пользователей')
        // fallback: формируем список из авторов постов
        setProfiles(
          Array.from(new Map(posts.map((p) => [p.author, p])).keys()).map((author, idx) => ({
            id: idx + 1,
            name: author,
            bio: 'Био недоступно',
          })),
        )
      })
      .finally(() => setProfilesLoading(false))
  }, [posts])

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

  const sendComment = async (postId: number) => {
    const t = (cText[postId] || '').trim()
    if (!token || !t || t.length > MAX_COMMENT_BODY) return
    setCErr((m) => ({ ...m, [postId]: '' }))
    setCPosting(postId)
    try {
      await post(`/posts/${postId}/comments`, { body: t }, token)
      setCText((m) => ({ ...m, [postId]: '' }))
      fetchFeed()
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
      fetchFeed()
    } catch (e) {
      setDelErr((m) => ({ ...m, [postId]: e instanceof Error ? e.message : 'Не удалось удалить' }))
    } finally {
      setCDeleting(null)
    }
  }

  const likePost = async (id: number, already: boolean) => {
    if (already || !token) return
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1, liked: true } : p)))
    try {
      const r = await patch<{ liked: boolean }>('/posts/' + id + '/like', {}, token)
      if (!r.liked) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes - 1), liked: false } : p)))
      } else {
        fetchFeed()
      }
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes - 1), liked: false } : p)))
    }
  }

  const addPost = async () => {
    if (!isAuth || !commentDraft.trim() || !token) return
    if (commentDraft.trim().length > MAX_POST_BODY) return
    setPostError('')
    setPosting(true)
    try {
      await post('/posts', { body: commentDraft.trim() }, token)
      fetchFeed()
      setCommentDraft('')
      setNewPostOpen(false)
      showToast('Пост опубликован')
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Ошибка публикации')
    } finally {
      setPosting(false)
    }
  }

  useEffect(() => {
    if (!newPostOpen) return
    setPostError('')
  }, [newPostOpen])

  const feedPosts = useMemo(() => posts, [posts])

  return (
    <div className={styles.grid}>
      <div className={styles.topBar}>
        <p className={styles.muted}>Подписчиков: {subs}</p>
        <div className={styles.topBarActions}>
          <Button type="button" variant="primary" onClick={() => setNewPostOpen(true)}>
            Новый пост
          </Button>
        </div>
      </div>

      <Card>
        <Section title="Лента">
          {!isAuth ? (
            <>
              <div className={styles.authTabs}>
                <Button type="button" onClick={() => setAuthMode('login')} variant={authMode === 'login' ? 'primary' : 'secondary'}>
                  Login
                </Button>
                <Button type="button" onClick={() => setAuthMode('signup')} variant={authMode === 'signup' ? 'primary' : 'secondary'}>
                  Signup
                </Button>
              </div>
              <Input autoComplete="username" placeholder="username" value={name} onChange={(e) => setName(e.target.value)} />
              <Input autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" onClick={authSubmit} disabled={loadingAuth || !name.trim() || password.length < 4} variant="primary">
                {loadingAuth ? '...' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </Button>
              {authError ? <p className={styles.error}>{authError}</p> : null}
            </>
          ) : (
            <>
              <Textarea
                placeholder="О себе"
                value={bioDraft}
                maxLength={MAX_BIO}
                onChange={(e) => setBioDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setBioDraft(bioSaved)
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    saveBio()
                  }
                }}
              />
              <div className={styles.inlineActions}>
                <Button type="button" onClick={saveBio} disabled={bioSaving || !bioDirty} variant="primary">
                  {bioSaving ? '...' : 'Сохранить био'}
                </Button>
                <Button type="button" onClick={() => setBioDraft(bioSaved)} disabled={bioSaving || !bioDirty} variant="ghost">
                  Отменить
                </Button>
                <p className={styles.muted}>
                  {bioDraft.length}/{MAX_BIO}
                </p>
              </div>
            </>
          )}
        </Section>
      </Card>

      <Card>
        <Section>
          <div className={styles.postHeader}>
            <h2>Посты</h2>
            <Button type="button" onClick={fetchFeed} variant="ghost" disabled={postsLoading}>
              Обновить
            </Button>
          </div>
          {postsLoading ? <p className={styles.muted}>Загрузка ленты…</p> : null}
          {postsFetchError ? <p className={styles.error}>{postsFetchError}</p> : null}
          <div className={styles.postFeed}>
            {feedPosts.map((p) => {
              const commentCount = p.commentCount ?? p.comments?.length ?? 0
              return (
                <article key={p.id} className={postCard.article}>
                  <header className={postCard.header}>
                    <div className={postCard.author}>
                      <AuthorLink name={p.author} />
                    </div>
                    <div className={postCard.meta}>
                      <time dateTime={p.date}>{p.date}</time>
                      <span className={postCard.chip} title="Комментарии">
                        💬 {commentCount}
                      </span>
                    </div>
                  </header>
                  <p className={postCard.body}>{p.text}</p>
                  <div className={postCard.actions}>
                    <Button type="button" onClick={() => void likePost(p.id, Boolean(p.liked))} disabled={!isAuth || Boolean(p.liked)} size="sm">
                      {p.liked ? '❤️' : '🤍'} {p.likes}
                    </Button>
                  </div>
                  {(p.comments ?? []).length > 0 ? (
                    <section className={styles.commentsBlock} aria-label="Комментарии к посту">
                      <h3 className={styles.commentsHeading}>
                        Комментарии
                        <span className={styles.commentsCount}>{commentCount}</span>
                      </h3>
                      <ul className={styles.commentList}>
                        {(p.comments ?? []).map((c) => {
                          const initial = (c.author?.trim().charAt(0) || '?').toUpperCase()
                          const canDelete =
                            isAuth && (c.userId != null ? Number(user?.id) === Number(c.userId) : user?.name === c.author)
                          const timeLabel = formatCommentTime(c.createdAt)
                          return (
                            <li className={styles.commentItem} key={c.id}>
                              <div className={styles.commentAvatar} aria-hidden>
                                {initial}
                              </div>
                              <div className={styles.commentContent}>
                                <div className={styles.commentHead}>
                                  <div className={styles.commentAuthorLine}>
                                    <AuthorLink name={c.author} withAt />
                                    {timeLabel ? (
                                      <time className={styles.commentTime} dateTime={c.createdAt}>
                                        {timeLabel}
                                      </time>
                                    ) : null}
                                  </div>
                                  {canDelete ? (
                                    <Button
                                      type="button"
                                      className={styles.commentDelete}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => void deleteComment(p.id, c.id)}
                                      disabled={cDeleting === c.id}
                                    >
                                      {cDeleting === c.id ? '...' : 'Удалить'}
                                    </Button>
                                  ) : null}
                                </div>
                                <p className={styles.commentText}>{c.text}</p>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ) : null}
                  {delErr[p.id] ? <p className={styles.error}>{delErr[p.id]}</p> : null}
                  {isAuth ? (
                    <div className={styles.commentComposer}>
                      <p className={styles.commentComposerLabel}>Ваш комментарий</p>
                      <Textarea
                        placeholder="Написать комментарий…"
                        value={cText[p.id] || ''}
                        maxLength={MAX_COMMENT_BODY}
                        rows={2}
                        readOnly={cPosting === p.id}
                        onChange={(e) => {
                          setCText((m) => ({ ...m, [p.id]: e.target.value }))
                          setCErr((m) => ({ ...m, [p.id]: '' }))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            void sendComment(p.id)
                          }
                        }}
                      />
                      <div className={styles.inlineActions}>
                        <Button type="button" onClick={() => void sendComment(p.id)} disabled={!(cText[p.id] || '').trim() || cPosting === p.id}>
                          {cPosting === p.id ? '...' : 'Отправить'}
                        </Button>
                        <small className={styles.muted}>
                          {(cText[p.id] || '').length}/{MAX_COMMENT_BODY}
                        </small>
                      </div>
                      {cErr[p.id] ? <p className={styles.error}>{cErr[p.id]}</p> : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </Section>
      </Card>

      <Card>
        <Section title="Профили">
          {profilesLoading ? <p className={styles.muted}>Загрузка пользователей…</p> : null}
          {profilesError ? <p className={styles.error}>{profilesError}</p> : null}
          {!profilesLoading && profiles.length === 0 ? <p className={styles.muted}>Пользователи пока не зарегистрированы.</p> : null}
          {profiles.map((p) => (
            <Button key={p.id} type="button" className={styles.profileButton} variant={activeProfile?.id === p.id ? 'primary' : 'secondary'} onClick={() => setActiveProfile(p)}>
              @{p.name}
            </Button>
          ))}
        </Section>
      </Card>

      <Modal open={newPostOpen} onClose={() => setNewPostOpen(false)}>
        <Section title="Новый пост">
          {!isAuth ? <p className={styles.muted}>Войдите, чтобы публиковать посты.</p> : null}
          <Textarea
            placeholder="Текст поста"
            value={commentDraft}
            maxLength={MAX_POST_BODY}
            rows={5}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void addPost()
              }
            }}
            disabled={!isAuth || posting}
          />
          <small className={styles.muted}>
            {commentDraft.length}/{MAX_POST_BODY} · Ctrl+Enter — опубликовать
          </small>
          {postError ? <p className={styles.error}>{postError}</p> : null}
          <div className={styles.inlineActions}>
            <Button type="button" variant="ghost" onClick={() => setNewPostOpen(false)} disabled={posting}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void addPost()} variant="primary" disabled={!isAuth || !commentDraft.trim() || posting}>
              {posting ? '...' : 'Опубликовать'}
            </Button>
          </div>
        </Section>
      </Modal>

      <Modal open={Boolean(activeProfile)} onClose={() => setActiveProfile(null)}>
        {activeProfile ? (
          <Section title={`Профиль @${activeProfile.name}`}>
            <p className={styles.muted}>ID: {activeProfile.id}</p>
            <p className={styles.muted}>Постов: {activeProfile.postsCount ?? 0}</p>
            <p>{activeProfile.bio || 'Пока без био'}</p>
            <div className={styles.inlineActions}>
              <Badge>Быстрый просмотр</Badge>
              <Button type="button" variant="ghost" onClick={() => setActiveProfile(null)}>
                Закрыть
              </Button>
            </div>
          </Section>
        ) : null}
      </Modal>

      {isAuth ? (
        <div className={styles.inlineActions}>
          <Badge>@{user?.name}</Badge>
          <Button type="button" onClick={logout} variant="ghost">
            Выйти
          </Button>
        </div>
      ) : null}

      {toast ? <Card>{toast}</Card> : null}
    </div>
  )
}

export default FeedPage
