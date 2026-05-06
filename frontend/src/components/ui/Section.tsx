import type { ReactNode } from 'react'
import styles from './ui.module.css'

type Props = {
  title?: string
  children: ReactNode
}

function Section({ title, children }: Props) {
  return (
    <section className={styles.section}>
      {title ? <h2 className={styles.sectionHeader}>{title}</h2> : null}
      {children}
    </section>
  )
}

export default Section
