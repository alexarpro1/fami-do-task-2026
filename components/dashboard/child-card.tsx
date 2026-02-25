"use client"

import { useFamily } from "@/context/family-context"
import { ChildPoints } from "@/components/points/child-points"

interface ChildCardProps {
  child: { id: string; name: string; avatar: string; color: string }
}

export function ChildCard({ child }: ChildCardProps) {
  const { dispatch } = useFamily()

  return (
    <button
      onClick={() => dispatch({ type: "SELECT_CHILD", payload: child.id })}
      className="flex flex-col items-center p-6 bg-card rounded-2xl neu-flat hover:scale-105 transition-transform"
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-3"
        style={{ backgroundColor: child.color + "30" }}
      >
        {child.avatar}
      </div>
      <span className="font-semibold text-foreground">{child.name}</span>
      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
        <span>⭐</span>
        <ChildPoints childId={child.id} labelOnly showLoading />
      </div>
    </button>
  )
}
