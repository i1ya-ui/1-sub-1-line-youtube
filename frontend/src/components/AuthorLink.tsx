import { useNavigate } from 'react-router-dom'
import { Button } from './ui'

type Props = {
  name: string
  withAt?: boolean
  onOpen?: (name: string) => void
}

function AuthorLink({ name, withAt, onOpen }: Props) {
  const navigate = useNavigate()
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => {
        if (onOpen) onOpen(name)
        else navigate(`/profile/${encodeURIComponent(name)}`)
      }}
    >
      {withAt ? '@' : ''}
      {name}
    </Button>
  )
}

export default AuthorLink
