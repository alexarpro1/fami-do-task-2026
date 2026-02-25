"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface ChildAvatarProps {
  avatar: string
  color: string
  size?: "sm" | "md" | "lg" | "xl"
  selected?: boolean
  onClick?: () => void
  showRing?: boolean
}

const sizeClasses = {
  sm: "w-10 h-10 text-xl",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
  xl: "w-28 h-28 text-5xl",
}

export function ChildAvatar({ avatar, color, size = "md", selected, onClick, showRing }: ChildAvatarProps) {
  const Component = onClick ? "button" : "div"

  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-300",
        sizeClasses[size],
        onClick && "cursor-pointer hover:scale-110 active:scale-95",
        selected && "ring-4 ring-primary ring-offset-2",
        showRing && "ring-4 ring-offset-2",
      )}
      style={{
        backgroundColor: color + "30",
        ...(showRing && ({ "--tw-ring-color": color } as React.CSSProperties)),
      }}
    >
      {avatar}
    </Component>
  )
}
