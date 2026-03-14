import { useState } from 'react'
function App() {
  const [subs, setSubs] = useState(8)
  const [reactions, setReactions] = useState([])
  const [spin, setSpin] = useState(0)
  const addReaction = () => setReactions(prev => [...prev, '🔥'].slice(-99))
  const rollDice = () => setSpin(Math.floor(Math.random() * 6) + 1)
  return (
    <div>
      <h1>1 Sub 1 Line</h1>
      <p>1 подписчик = 1 строка кода</p>
      <button onClick={addReaction}>🔥 Реакция ({reactions.length})</button>
      <button onClick={rollDice}>🎲 {spin || 'Крутить'}</button>
    </div>
  )
}

export default App
