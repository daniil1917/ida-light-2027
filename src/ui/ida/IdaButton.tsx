import { Button, type ButtonProps } from '../fluid/button'

export function IdaButton({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <Button type="button" variant={variant} className={`w-full h-12 text-sm ${variant === 'primary' ? 'brand-action' : ''} ${className}`} {...props} />
}
