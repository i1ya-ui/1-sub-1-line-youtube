import type { ReactNode } from 'react'
import styles from './ui.module.css'

function PageContainer({ children }: { children: ReactNode }) {
  return <main className={styles.pageContainer}>{children}</main>
}

export default PageContainer
