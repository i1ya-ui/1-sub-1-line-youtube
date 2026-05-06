import type { ButtonHTMLAttributes } from 'react'
import styles from './ui.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'sm' | 'md'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClass: Record<Variant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
  link: styles.buttonLink,
}

const sizeClass: Record<Size, string> = {
  sm: styles.buttonSm,
  md: styles.buttonMd,
}

function Button({ variant = 'secondary', size = 'md', className = '', ...props }: Props) {
  const sizeCls = variant === 'link' ? '' : sizeClass[size]
  return <button className={`${styles.button} ${variantClass[variant]} ${sizeCls} ${className}`.trim()} {...props} />
}

export default Button
