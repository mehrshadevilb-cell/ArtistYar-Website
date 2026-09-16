import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
}

export function ForwardChevron({ className }: IconProps) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={cn("size-4 shrink-0 rtl:rotate-180", className)}
    />
  )
}

export function BackChevron({ className }: IconProps) {
  return (
    <ChevronLeft
      aria-hidden="true"
      className={cn("size-4 shrink-0 rtl:rotate-180", className)}
    />
  )
}

export function ForwardArrow({ className }: IconProps) {
  return (
    <ArrowRight
      aria-hidden="true"
      className={cn("size-4 shrink-0 rtl:rotate-180", className)}
    />
  )
}

export function BackArrow({ className }: IconProps) {
  return (
    <ArrowLeft
      aria-hidden="true"
      className={cn("size-4 shrink-0 rtl:rotate-180", className)}
    />
  )
}

export function DropdownChevron({ className }: IconProps) {
  return <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0", className)} />
}
