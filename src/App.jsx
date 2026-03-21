import { useState, useEffect } from 'react'
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
function App() {
  const [subs, setSubs] = useState(23)
  const [reactions, setReactions] = useState([])
  const addReaction = () => setReactions(prev => [...prev, '🔥'].slice(-99))
  const [chat, setChat] = useState(['Привет, стрим!'])
  const [unlockTier, setUnlockTier] = useState(subs >= 20 ? 2 : subs >= 10 ? 1 : 0)
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
  const [posts, setPosts] = useState([{ id: 1, text: 'Первый пост в соцсети!', likes: 0, author: 'user_1', date: '20.03' }, { id: 2, text: 'Кто тут?', likes: 0, author: 'random_dev', date: '19.03' }, { id: 3, text: 'Подписывайтесь!', likes: 0, author: 'user_1', date: '18.03' }])
  const [profiles, setProfiles] = useState([{ id: 1, name: 'user_1', avatar: '🦊', bio: 'Лис в сети' }, { id: 2, name: 'random_dev', avatar: '🐱', bio: 'Код и кофе' }])
  const [follows, setFollows] = useState(0)
  const [notifications, setNotifications] = useState(0)
  const [theme, setTheme] = useState(0)
  const cycleTheme = () => setTheme(t => (t + 1) % 3)
  const themeName = ['Тёмная', 'Светлая', 'Матрица'][theme]
  const [konami, setKonami] = useState(false)
  const [emojiBar] = useState(['🔥','👍','😂','💀'])
  const addEmoji = (e) => setReactions(prev => [...prev, e].slice(-99))
  const [konamiIndex, setKonamiIndex] = useState(0)
  const [stickers, setStickers] = useState([])
  const dropSticker = () => setStickers(s => [...s, { id: Date.now(), emoji: ['🌟','💫','✨','⭐'][Math.floor(Math.random()*4)], x: Math.random()*80, y: Math.random()*50 }].slice(-12))
  const [stories] = useState([{ id: 1, user: 'user_1' }, { id: 2, user: 'random_dev' }, { id: 3, user: 'viewer_99' }])
  const [dms, setDms] = useState([])
  const addDM = () => setDms(d => [...d, `Новое сообщение #${d.length+1}`].slice(-5))
  const [live, setLive] = useState(true)
  const [poll, setPoll] = useState({ a: 0, b: 0 })
  const votePoll = (v) => setPoll(p => ({ ...p, [v]: p[v] + 1 }))
  const [coins, setCoins] = useState(0)
  const earnCoin = () => setCoins(c => c + 1)
  const [raid, setRaid] = useState(false)
  const [muted, setMuted] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const likeWithConfetti = () => { setLikes(l => l + 1); setConfetti(true); setTimeout(() => setConfetti(false), 800) }
  const [trending] = useState(['#viral', '#стрим', '#1sub1line', '#хаос', '#подпишись'])
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
  const bgStyle = theme === 0 ? (chaos ? '#ff00ff' : hype % 2 ? '#000000' : 'linear-gradient(135deg,#1a0a2e 0%,#16213e 50%,#0f3460 100%)') : theme === 1 ? '#f5f5f5' : 'linear-gradient(180deg,#003300 0%,#000 50%)'
  const colorStyle = theme === 2 ? '#00ff00' : theme === 1 ? '#111' : '#00f6ff'
  return (
    <div style={{ background: bgStyle, color: colorStyle, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '20px', transition: 'all 0.25s ease', transform: chaos ? `rotate(${hype * 7}deg) scale(${1 + hype * 0.05})` : 'none', animation: notifications > 3 ? 'pulse 0.5s ease' : 'none' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }`}</style>
      {confetti && <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998, fontSize: 24 }}>🎉✨🎊⭐💫</div>}
      {stickers.map(s => <div key={s.id} style={{ position: 'fixed', left: `${s.x}%`, top: `${s.y}%`, fontSize: 28, pointerEvents: 'none', zIndex: 997 }}>{s.emoji}</div>)}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${colorStyle}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
        <h1 style={{ fontSize: '2.2em', textShadow: hype > 2 ? `0 0 20px ${colorStyle}` : 'none' }}>1 Sub 1 Line — Соцсеть</h1>
        {live && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.7em' }}>LIVE</span>}
        <button onClick={() => setNotifications(n => n + 1)} style={{ fontSize: '1.5em' }}>🔔 {notifications}</button>
        <button onClick={cycleTheme}>{themeName}</button>
      </div>
      <p>1 подписчик = 1 строка кода <span style={{ color: theme === 2 ? '#0f0' : '#ff0' }}>✓</span></p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 320 }}>{trending.map((t,i) => <span key={i} style={{ background: '#ff0333', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>{t}</span>)}</div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0', width: '100%', maxWidth: 320 }}>
        {stories.map(s => <div key={s.id} style={{ minWidth: 56, height: 56, borderRadius: '50%', border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>📷</div>)}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {emojiBar.map((e,i) => <button key={i} onClick={() => addEmoji(e)} style={{ fontSize: '1.2em' }}>{e}</button>)}
      </div>
      <button onClick={dropSticker}>🎨 Стикеры</button>
      <button onClick={likeWithConfetti}>❤️ Лайки: {likes}</button>
      <button onClick={addReaction}>🔥 Реакции ({reactions.length})</button>
      <div style={{ maxHeight: 80, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 12, width: '100%', maxWidth: 300 }}>
        {chat.map((c,i) => <div key={i} style={{ background: 'rgba(0,255,0,0.1)', padding: '4px 10px', borderRadius: 12, marginBottom: 4, marginLeft: i % 2 ? 20 : 0 }}>{new Date().toLocaleTimeString().slice(0,5)} — {c}</div>)}
      </div>
      <button onClick={sendChat}>💬 Чат</button>
      <input placeholder="Написать комментарий..." style={{ padding: 6, width: 200 }} />
      <button onClick={() => { shareViral(); setPosts(p => [...p, { id: p.length+1, text: 'Репост!', likes: 0, author: 'ты', date: 'сейчас' }]) }}>📤 Репост</button>
      <button onClick={triggerChaos}>🌀 {chaosLabel}</button>
      <button onClick={boostHype}>🚀 {hypeLabel}</button>
      <button onClick={() => setFollows(f => f + 1)}>👥 Подписаться: {follows}</button>
      <button onClick={() => { setFollows(f => f + 1); setProfiles(p => [...p, { id: p.length+1, name: `random_${Math.floor(Math.random()*999)}`, avatar: '🎲', bio: '???无明显' }]) }}>🎲 Случайный</button>
      <button onClick={addDM}>✉️ ЛС ({dms.length})</button>
      <button onClick={() => setRaid(r => !r)}>⚔️ {raid ? 'RAID ON' : 'RAID'}</button>
      <button onClick={() => setMuted(m => !m)}>🔇 {muted ? 'Включить' : 'Заглушить'}</button>
      <button onClick={earnCoin}>🪙 Монетки: {coins}</button>
      <button onClick={() => alert('GIF пока не подключены 😅')}>GIF</button>
      <p>Тир: {unlockTier} | {mood} <button onClick={cycleMood}>Настроение</button> | <button onClick={hitStreak}>Серия: {streak}</button></p>
      <p>Хайп-трекер | Хаос: {chaosScore}</p>
      <p>{chaosBanner}</p>
      <section style={{ marginTop: 16, borderTop: '1px solid', paddingTop: 12, width: '100%', maxWidth: 320 }}>
        <h3>Лента</h3>
        {posts.map(p => <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}><small>{p.author} ✓ · {p.date}</small><p>{p.text}</p><div><button onClick={likeWithConfetti}>❤️</button><button onClick={() => votePoll('a')}>A</button><button onClick={() => votePoll('b')}>B</button> Голос: {poll.a} vs {poll.b}</div></div>)}
      </section>
      <section style={{ marginTop: 8 }}>
        <h3>Профили</h3>
        {profiles.map(p => <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, marginBottom: 8, borderRadius: 8 }}><span style={{ fontSize: '1.5em' }}>{p.avatar}</span> <span>{p.name} ✓</span><p style={{ fontSize: '0.9em', opacity: 0.8 }}>{p.bio}</p></div>)}
      </section>
      {konami && <p style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '2em', background: '#000', color: '#0f0', padding: 20, zIndex: 999 }}>⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️ BA — ТЫ НАШЁЛ ПАСХАЛКУ</p>}
    </div>
  )
}

export default App
