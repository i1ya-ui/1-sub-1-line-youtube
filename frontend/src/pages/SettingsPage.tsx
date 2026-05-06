import { useTheme } from '../app/theme'
import { Badge, Button, Card, Section } from '../components/ui'

function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Card>
      <Section title="Настройки интерфейса">
        <Badge>Текущая тема: {theme === 'dark' ? 'Тёмная' : 'Светлая'}</Badge>
        <Button type="button" variant="primary" onClick={toggleTheme}>
          Переключить тему
        </Button>
      </Section>
    </Card>
  )
}

export default SettingsPage
