import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "danger" | "warning" | "outline" | "gold";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-navy-700 text-slate-100",
    success: "bg-profit/20 text-profit-light border border-profit/30",
    danger: "bg-loss/20 text-loss-light border border-loss/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    gold: "bg-gold/20 text-gold-light border border-gold/30",
    outline: "text-slate-200 border border-white/20",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
