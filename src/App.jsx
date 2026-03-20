import { useState, useEffect } from 'react'
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
function App() {
  const [subs, setSubs] = useState(23)
  const [reactions, setReactions] = useState([])
  const [spin, setSpin] = useState(0)
  const addReaction = () => setReactions(prev => [...prev, '🔥'].slice(-99))
  const rollDice = () => setSpin(Math.floor(Math.random() * 6) + 1)
  const [leaderboard, setLeaderboard] = useState([{ id: 1, name: 'Зритель', score: 0, avatar: '👤' }])
  const [chat, setChat] = useState(['Привет, стрим!'])
  const [unlockTier, setUnlockTier] = useState(subs >= 20 ? 2 : subs >= 10 ? 1 : 0)
  const addToLeaderboard = () => setLeaderboard(l => [...l.slice(-4), { id: l.length + 1, name: `Зритель_${l.length}`, score: Math.floor(Math.random() * 999), avatar: ['👤','🧑','👩','🦊','🐱'][l.length % 5] }])
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
  const [hype, setHype] = useState(0)
  const boostHype = () => setHype(h => h + 1)
  const hypeLabel = `Хайп x${hype + 1}`
  const [likes, setLikes] = useState(0)
  const [posts, setPosts] = useState([{ id: 1, text: 'Первый пост в соцсети!', likes: 0 }, { id: 2, text: 'Кто тут?', likes: 0 }, { id: 3, text: 'Подписывайтесь!', likes: 0 }])
  const [profiles, setProfiles] = useState([{ id: 1, name: 'user_1', avatar: '🦊' }, { id: 2, name: 'random_dev', avatar: '🐱' }])
  const [follows, setFollows] = useState(0)
  const [notifications, setNotifications] = useState(0)
  const [dark, setDark] = useState(true)
  const [konami, setKonami] = useState(false)
  const [emojiBar] = useState(['🔥','👍','😂','💀'])
  const addEmoji = (e) => setReactions(prev => [...prev, e].slice(-99))
  const [konamiIndex, setKonamiIndex] = useState(0)
  useEffect(() => {
    const h = (ev) => {
      if (ev.key === KONAMI[konamiIndex]) {
        if (konamiIndex === KONAMI.length - 1) setKonami(true)
        setKonamiIndex(i => (i + 1) % KONAMI.length)
      } else setKonamiIndex(0)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [konamiIndex])
  return (
    <div style={{ background: dark ? (chaos ? '#ff00ff' : hype % 2 ? '#000000' : 'linear-gradient(135deg,#1a0a2e 0%,#16213e 50%,#0f3460 100%)') : '#f5f5f5', color: dark ? '#00f6ff' : '#111', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '20px', transition: 'all 0.25s ease', transform: chaos ? `rotate(${(spin || hype) * 7}deg) scale(${1 + hype * 0.05})` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#00f6ff33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
        <h1 style={{ fontSize: '2.2em', textShadow: hype > 2 ? '0 0 20px #00f6ff' : 'none' }}>1 Sub 1 Line — Соцсеть</h1>
        <button onClick={() => setNotifications(n => n + 1)} style={{ fontSize: '1.5em' }}>🔔 {notifications}</button>
        <button onClick={() => setDark(d => !d)}>🌙/☀️ Тема</button>
      </div>
      <p>1 подписчик = 1 строка кода</p>
      <span style={{ background: '#ff0', color: '#000', padding: '2px 8px', borderRadius: 4 }}>#viral</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {emojiBar.map((e,i) => <button key={i} onClick={() => addEmoji(e)} style={{ fontSize: '1.2em' }}>{e}</button>)}
      </div>
      <button onClick={() => setLikes(l => l + 1)}>❤️ Лайки: {likes}</button>
      <button onClick={addReaction}>🔥 Реакции ({reactions.length})</button>
      <div style={{ maxHeight: 80, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8, width: '100%', maxWidth: 300 }}>{reactions.map((r,i) => <span key={i}>{r} </span>)}</div>
      <button onClick={rollDice}>🎲 {spin || 'Крутить'}</button>
      <button onClick={addToLeaderboard}>📊 Топ</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 280 }}>
        {leaderboard.slice(-5).map(u => <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{u.avatar}</span><span>{u.name}: {u.score}</span></div>)}
      </div>
      <button onClick={sendChat}>💬 Чат: {chat.length}</button>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9em' }}>{chat.map((c,i) => <li key={i}>{new Date().toLocaleTimeString().slice(0,5)} — {c}</li>)}</ul>
      <input placeholder="Написать комментарий..." style={{ padding: 6, width: 200 }} />
      <button onClick={shareViral}>📤 Поделиться</button>
      <button onClick={triggerChaos}>🌀 {chaosLabel}</button>
      <button onClick={boostHype}>🚀 {hypeLabel}</button>
      <button onClick={() => setFollows(f => f + 1)}>👥 Подписаться: {follows}</button>
      <button onClick={() => { setFollows(f => f + 1); setProfiles(p => [...p, { id: p.length+1, name: `random_${Math.floor(Math.random()*999)}`, avatar: '🎲' }]) }}>🎲 Подписаться на случайного</button>
      <p>Тир: {unlockTier} | {mood} <button onClick={cycleMood}>Настроение</button> | <button onClick={hitStreak}>Серия: {streak}</button></p>
      <p>Хайп-трекер для чата</p>
      <p>Хаос-очки: {chaosScore}</p>
      <p>{chaosBanner}</p>
      <section style={{ marginTop: 16, borderTop: '1px solid', paddingTop: 12, width: '100%', maxWidth: 320 }}>
        <h3>Лента постов</h3>
        {posts.map(p => <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}><p>{p.text}</p><button onClick={() => setLikes(l => l + 1)}>❤️</button></div>)}
      </section>
      <section style={{ marginTop: 8 }}>
        <h3>Профили</h3>
        {profiles.map(p => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ fontSize: '1.5em' }}>{p.avatar}</span><span>{p.name}</span></div>)}
      </section>
      {konami && <p style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '2em', background: '#000', color: '#0f0', padding: 20, zIndex: 999 }}>⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️ BA — ТЫ НАШЁЛ ПАСХАЛКУ</p>}
    </div>
  )
}

export default App
