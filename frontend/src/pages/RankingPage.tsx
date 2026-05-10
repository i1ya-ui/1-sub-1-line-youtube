import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/client'
import AuthorLink from '../components/AuthorLink'
import { Button, Card, PageContainer, Section } from '../components/ui'
import styles from './RankingPage.module.css'

type RankingRow = {
  rank: number
  id: number
  name: string
  bio: string
  postsCount: number
  profilePoints: number
}

function RankingPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    get<{ ranking: RankingRow[] }>('/users/ranking?limit=100')
      .then((d) => setRows(d.ranking ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить рейтинг'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageContainer>
      <Card>
        <header className={styles.headerRow}>
          <h1 className={styles.title}>Рейтинг по очкам</h1>
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            К ленте
          </Button>
        </header>
        <p className={styles.meta}>Учитываются очки профиля: регистрация, посты, комментарии и лайки.</p>
      </Card>

      {loading ? <p className={styles.meta}>Загрузка…</p> : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <Card>
          <Section title="Таблица лидеров">
            {rows.length === 0 ? (
              <p className={styles.meta}>Пока нет пользователей в рейтинге.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.rankCell}>#</th>
                      <th className={styles.userCell}>Участник</th>
                      <th>Очки</th>
                      <th>Постов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className={r.rank <= 3 ? styles.topThree : undefined}>
                        <td className={styles.rankCell}>{r.rank}</td>
                        <td className={styles.userCell}>
                          <AuthorLink name={r.name} withAt />
                        </td>
                        <td className={styles.pointsCell}>{r.profilePoints}</td>
                        <td className={styles.postsCell}>{r.postsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </Card>
      ) : null}
    </PageContainer>
  )
}

export default RankingPage
