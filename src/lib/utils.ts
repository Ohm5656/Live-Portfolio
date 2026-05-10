import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}

export function formatNumber(amount: number, minimumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(amount)
}
