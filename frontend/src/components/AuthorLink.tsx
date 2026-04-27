type Props = {
  name: string
  withAt?: boolean
  onOpen: (name: string) => void
}

function AuthorLink({ name, withAt, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(name)}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'inherit',
        padding: 0,
        cursor: 'pointer',
        textDecoration: 'underline',
      }}
    >
      {withAt ? '@' : ''}
      {name}
    </button>
  )
}

export default AuthorLink
