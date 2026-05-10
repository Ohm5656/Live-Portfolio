import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "default" | "outline" | "ghost" | "danger" | "success" | "gold";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-sm",
      outline: "border border-white/20 bg-transparent hover:bg-white/10 text-slate-200",
      ghost: "bg-transparent hover:bg-white/10 text-slate-200",
      danger: "bg-loss/20 text-loss-light border border-loss/30 hover:bg-loss/30",
      success: "bg-profit/20 text-profit-light border border-profit/30 hover:bg-profit/30",
      gold: "bg-gold/20 text-gold-light border border-gold/30 hover:bg-gold/30",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-md px-8 text-lg",
      icon: "h-9 w-9 flex items-center justify-center",
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
