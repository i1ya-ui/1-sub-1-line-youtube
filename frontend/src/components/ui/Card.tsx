import type { ReactNode } from 'react'
import styles from './ui.module.css'

type Props = {
  children: ReactNode
  muted?: boolean
  className?: string
}

function Card({ children, muted, className = '' }: Props) {
  return <article className={`${styles.card} ${muted ? styles.cardMuted : ''} ${className}`.trim()}>{children}</article>
}

export default Card
