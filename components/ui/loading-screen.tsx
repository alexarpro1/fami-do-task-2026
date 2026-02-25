"use client"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo */}
        <img src="/icon.png" alt="FamiDo Task" className="h-24 w-24 rounded-2xl object-contain animate-bounce-in" />
        <h1 className="font-[var(--font-fredoka)] text-3xl font-bold text-primary">FamiDo Task</h1>

        {/* Loading Dots */}
        <div className="flex gap-2 mt-4">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>

        <p className="text-muted-foreground mt-2">Laden...</p>
      </div>
    </div>
  )
}
