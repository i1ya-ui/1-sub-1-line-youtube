import type { TextareaHTMLAttributes } from 'react'
import styles from './ui.module.css'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

function Textarea({ className = '', ...props }: Props) {
  return <textarea className={`${styles.field} ${styles.textarea} ${className}`.trim()} {...props} />
}

export default Textarea
