import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Card from './Card'
import styles from './ui.module.css'

type Props = {
  open: boolean
  children: ReactNode
  onClose: () => void
}

function Modal({ open, children, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="presentation">
        <Card className={styles.modalCard}>{children}</Card>
      </div>
    </div>
  )
}

export default Modal
