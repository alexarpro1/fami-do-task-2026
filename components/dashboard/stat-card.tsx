interface StatCardProps {
  icon: string
  value: number
  label: string
  color: string
}

export function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-xl neu-flat">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ backgroundColor: color + "20" }}
      >
        {icon}
      </div>
      <div>
        <p className="font-[var(--font-fredoka)] text-xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
