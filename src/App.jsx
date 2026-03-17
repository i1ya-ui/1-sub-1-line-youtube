import { useState } from 'react'
function App() {
  const [subs, setSubs] = useState(23)
  const [reactions, setReactions] = useState([])
  const [spin, setSpin] = useState(0)
  const addReaction = () => setReactions(prev => [...prev, '🔥'].slice(-99))
  const rollDice = () => setSpin(Math.floor(Math.random() * 6) + 1)
  const [leaderboard, setLeaderboard] = useState([{ id: 1, name: 'Зритель', score: 0 }])
  const [chat, setChat] = useState(['Привет, стрим!'])
  const [unlockTier, setUnlockTier] = useState(subs >= 20 ? 2 : subs >= 10 ? 1 : 0)
  const addToLeaderboard = () => setLeaderboard(l => [...l.slice(-4), { id: l.length + 1, name: `Зритель_${l.length}`, score: Math.floor(Math.random() * 999) }])
  const sendChat = () => setChat(c => [...c, `Сообщение #${c.length + 1}`].slice(-10))
  const shareViral = () => navigator.share?.({ title: '1 Sub 1 Line', url: window.location.href })
  const [mood, setMood] = useState('😐')
  const cycleMood = () => setMood(m => ['😐', '😎', '🔥', '💀', '🤡'][(['😐', '😎', '🔥', '💀', '🤡'].indexOf(m) + 1) % 5])
  const [streak, setStreak] = useState(0)
  const hitStreak = () => setStreak(s => s + 1)
  const [chaos, setChaos] = useState(false)
  const triggerChaos = () => setChaos(c => !c && Math.random() > 0.3)
  const chaosLabel = chaos ? 'ХАОС ВКЛ' : 'ХАОС ВЫКЛ'
  const chaosScore = chaos ? Math.floor(Math.random() * 9999) : 0
  const chaosBanner = chaos ? 'СТРИМ В РЕЖИМЕ МУТАЦИИ' : 'Обычный стрим (пока)'
  const [meme, setMeme] = useState('')
  const dropMeme = () => setMeme(['Алгоритм любит хаос', 'Подпишись или пропусти секрет'][Math.floor(Math.random() * 2)])
  const [hype, setHype] = useState(0)
  const boostHype = () => setHype(h => h + 1)
  const hypeLabel = `Хайп x${hype + 1}`
  return (
    <div style={{ background: chaos ? '#ff00ff' : hype % 2 ? '#000000' : '#050018', color: '#00f6ff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.25s ease', transform: chaos ? `rotate(${(spin || hype) * 7}deg) scale(${1 + hype * 0.05})` : 'none' }}>
      <h1>1 Sub 1 Line</h1>
      <p>1 подписчик = 1 строка кода</p>
      <button onClick={addReaction}>🔥 Реакция ({reactions.length})</button>
      <button onClick={rollDice}>🎲 {spin || 'Крутить'}</button>
      <button onClick={addToLeaderboard}>📊 Топ</button>
      <button onClick={sendChat}>💬 Чат: {chat.length}</button>
      <button onClick={shareViral}>📤 Поделиться</button>
      <button onClick={triggerChaos}>🌀 {chaosLabel}</button>
      <button onClick={dropMeme}>🤡 Мем</button>
      <button onClick={boostHype}>🚀 {hypeLabel}</button>
      <p>Тир: {unlockTier} | {mood} <button onClick={cycleMood}>Настроение</button> | <button onClick={hitStreak}>Серия: {streak}</button></p>
      <p>Хайп-трекер для чата</p>
      <p>Хаос-очки: {chaosScore}</p>
      <p>{chaosBanner} {meme}</p>
    </div>
  )
}

export default App
