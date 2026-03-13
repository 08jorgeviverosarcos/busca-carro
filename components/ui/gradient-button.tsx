import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const gradientButtonVariants = cva(
  'ai-gradient text-white font-bold inline-flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      size: {
        sm: 'h-9 px-4 rounded-lg text-sm',
        md: 'px-8 py-3 rounded-lg text-sm',
        lg: 'h-12 px-8 rounded-xl',
      },
      shadow: {
        true: 'shadow-lg shadow-[#3c83f6]/20',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      shadow: true,
      fullWidth: false,
    },
  }
)

function GradientButton({
  className,
  size,
  shadow,
  fullWidth,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof gradientButtonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      className={cn(gradientButtonVariants({ size, shadow, fullWidth }), className)}
      {...props}
    />
  )
}

export { GradientButton, gradientButtonVariants }
