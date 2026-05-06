import { NavLink, Route, Routes } from 'react-router-dom'
import { useTheme } from './app/theme'
import { Badge, Button, Card, PageContainer } from './components/ui'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import styles from './App.module.css'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.layout}>
      <PageContainer>
        <Card className={styles.headerCard}>
          <div className={styles.brand}>
            <h1 className={styles.title}>1 Sub 1 Line</h1>
            <Badge>{theme === 'dark' ? 'Dark' : 'Light'}</Badge>
          </div>
          <p className={styles.meta}>Минималистичный интерфейс с единым дизайн-системным слоем</p>
          <div className={styles.headerActions}>
            <Button type="button" variant="ghost" onClick={toggleTheme}>
              Сменить тему
            </Button>
          </div>
        </Card>

        <Card className={styles.navCard}>
          <NavLink
            to="/"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim()}
          >
            Лента
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim()}
          >
            Настройки
          </NavLink>
        </Card>

        <div className={styles.content}>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/profile/:name" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </PageContainer>
    </div>
  )
}

export default App
