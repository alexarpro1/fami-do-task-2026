interface QuickActionCardProps {
  icon: string
  title: string
  subtitle: string
  color: string
}

export function QuickActionCard({ icon, title, subtitle, color }: QuickActionCardProps) {
  return (
    <div className="flex flex-col items-center p-4 bg-card rounded-xl neu-flat hover:scale-105 transition-transform">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-2"
        style={{ backgroundColor: color + "20" }}
      >
        {icon}
      </div>
      <span className="font-semibold text-foreground text-center">{title}</span>
      <span className="text-xs text-muted-foreground text-center">{subtitle}</span>
    </div>
  )
}
