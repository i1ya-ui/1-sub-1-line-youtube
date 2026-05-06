import type { ReactNode } from 'react'
import styles from './ui.module.css'

function Badge({ children }: { children: ReactNode }) {
  return <span className={styles.badge}>{children}</span>
}

export default Badge
