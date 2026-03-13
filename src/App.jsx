import { useState } from 'react'
function App() {
  const [subs, setSubs] = useState(2)
  return (
    <div>
      <h1>1 Sub 1 Line</h1>
      <p>1 подписчик = 1 строка кода</p>
    </div>
  )
}

export default App
