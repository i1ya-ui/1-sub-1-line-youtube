import type { InputHTMLAttributes } from 'react'
import styles from './ui.module.css'

type Props = InputHTMLAttributes<HTMLInputElement>

function Input({ className = '', ...props }: Props) {
  return <input className={`${styles.field} ${className}`.trim()} {...props} />
}

export default Input
