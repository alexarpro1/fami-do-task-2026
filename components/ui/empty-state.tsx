import type React from "react"
interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-6xl mb-4 animate-float">{icon}</div>
      <h3 className="font-[var(--font-fredoka)] text-xl font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
