"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import Link from "next/link"
import { Zap, Brain, Hand, Palette, ArrowLeft, Crown, LayoutGrid, ChevronUp, ChevronDown, Calculator, Type, Target, List, Grid2x2 } from "lucide-react"
import { GoldCoinIcon } from "@/components/ui/gold-coin-icon"

const COINS_BANNER_DURATION_MS = 1500
import { ReactionGame } from "@/components/games/reaction-game"
import { MemoryGame } from "@/components/games/memory-game"
import { TapGame } from "@/components/games/tap-game"
import { ColorClickGame } from "@/components/games/color-click-game"
import { MathQuestGame } from "@/components/games/math-quest-game"
import { WordBuilderGame } from "@/components/games/word-builder-game"
import { MoleDashGame } from "@/components/games/mole-dash-game"
import { ChessGame, DameGame } from "@/components/games/sdg"

export type GameId = "reaction" | "memory" | "tap" | "color" | "chess" | "dame" | "math" | "word" | "mole" | null

type ConcreteGameId = Exclude<GameId, null>

const GAMES: { id: GameId; title: string; description: string; icon: React.ElementType; coinsHint: string }[] = [
  { id: "reaction", title: "Reaktionsspiel", description: "Klicke, sobald es grün wird!", icon: Zap, coinsHint: "Bis zu 15 Goldmünzen pro Runde" },
  { id: "memory", title: "Memory", description: "Finde die Paare.", icon: Brain, coinsHint: "20 Goldmünzen beim Gewinnen" },
  { id: "tap", title: "Tipp-Challenge", description: "Tippe so schnell du kannst!", icon: Hand, coinsHint: "Bis zu 15 Goldmünzen" },
  { id: "color", title: "Farb-Klick", description: "Klicke nur wenn GRÜN erscheint.", icon: Palette, coinsHint: "5 Goldmünzen pro richtiger Runde" },
  { id: "math", title: "MathQuest", description: "Löse Mathe-Rätsel gegen die Zeit!", icon: Calculator, coinsHint: "3 Goldmünzen pro Frage + Perfekt-Bonus" },
  { id: "word", title: "WordBuilder", description: "Fülle die fehlenden Buchstaben!", icon: Type, coinsHint: "5 Goldmünzen pro Wort + Serien-Bonus" },
  { id: "mole", title: "MoleDash", description: "Triff die Maulwürfe!", icon: Target, coinsHint: "3 Goldmünzen pro Treffer + Combo-Bonus" },
  { id: "chess", title: "Schach", description: "Zwei Spieler – gewinne oder spiele unentschieden.", icon: Crown, coinsHint: "Sieg 30, Patt 10 Goldmünzen" },
  { id: "dame", title: "Dame", description: "Zwei Spieler – Steine schlagen und zur Dame krönen.", icon: LayoutGrid, coinsHint: "Sieg 25, Unentschieden 10 Goldmünzen" },
]

const LEVEL_STORAGE_KEYS: Partial<Record<ConcreteGameId, string>> = {
  reaction: "famiapp-reaction-progress",
  memory: "famiapp-memory-progress",
  tap: "famiapp-tap-progress",
  color: "famiapp-color-click-progress",
  math: "famiapp-math-progress",
  word: "famiapp-word-progress",
  mole: "famiapp-mole-progress",
  chess: "famiapp-chess-progress",
  dame: "fami-dame-progress",
}

const DEFAULT_GAMES_ORDER: GameId[] = ["reaction", "memory", "tap", "color", "math", "word", "mole", "chess", "dame"]

export default function SpielePage() {
  const { selectedChild, dispatch, state } = useFamily()
  const [activeGame, setActiveGame] = useState<GameId>(null)
  const [celebration, setCelebration] = useState<{ active: boolean; amount: number; message: string }>({ active: false, amount: 0, message: "" })
  const [gameLevels, setGameLevels] = useState<Partial<Record<ConcreteGameId, { level: number; xpPercent: number }>>>({})
  const [showCoinsBanner, setShowCoinsBanner] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")

  const gamesOrder: GameId[] =
    state.settings?.gamesOrder && Array.isArray(state.settings.gamesOrder) && state.settings.gamesOrder.length >= GAMES.length
      ? (state.settings.gamesOrder.filter((id: unknown): id is Exclude<GameId, null> => typeof id === "string" && (GAMES as { id: string }[]).some((g) => g.id === id)) as GameId[])
      : DEFAULT_GAMES_ORDER

  const orderedGames = gamesOrder.map((id) => GAMES.find((g) => g.id === id)).filter((g): g is (typeof GAMES)[number] => g != null)
  const missingFromOrder = GAMES.filter((g) => !gamesOrder.includes(g.id!))
  const gamesToShow = [...orderedGames, ...missingFromOrder]

  const moveGame = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= gamesToShow.length) return
    const ids = gamesToShow.map((g) => g.id!)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    dispatch({ type: "UPDATE_SETTINGS", payload: { gamesOrder: ids } })
  }

  const readGameProgress = () => {
    if (typeof window === "undefined") return
    try {
      const levels: Partial<Record<ConcreteGameId, { level: number; xpPercent: number }>> = {}
      for (const [gameId, key] of Object.entries(LEVEL_STORAGE_KEYS)) {
        const raw = localStorage.getItem(key!)
        if (!raw) { levels[gameId as ConcreteGameId] = { level: 1, xpPercent: 0 }; continue }
        try {
          const parsed = JSON.parse(raw)
          const lvl = typeof parsed.level === "number" && parsed.level > 0 ? Math.min(50, Math.floor(parsed.level)) : 1
          const xpTotal = typeof parsed.xp === "number" ? parsed.xp : 0
          const xpInLevel = Math.max(0, xpTotal - (lvl - 1) * 100)
          const pct = lvl >= 50 ? 100 : Math.min(100, Math.round((xpInLevel / 100) * 100))
          levels[gameId as ConcreteGameId] = { level: lvl, xpPercent: pct }
        } catch {
          levels[gameId as ConcreteGameId] = { level: 1, xpPercent: 0 }
        }
      }
      setGameLevels(levels)
    } catch { /* ignore */ }
  }

  useEffect(() => { readGameProgress() }, [])
  useEffect(() => { if (!activeGame) readGameProgress() }, [activeGame])

  const awardGoldCoins = (amount: number, message: string, _reason?: string) => {
    if (!selectedChild || amount <= 0) return
    dispatch({ type: "UPDATE_CHILD", payload: { id: selectedChild.id, updates: { gameGoldCoins: (selectedChild.gameGoldCoins ?? 0) + amount } } })
    setCelebration({ active: true, amount, message })
    setShowCoinsBanner(true)
  }

  useEffect(() => {
    if (!showCoinsBanner) return
    const t = setTimeout(() => setShowCoinsBanner(false), COINS_BANNER_DURATION_MS)
    return () => clearTimeout(t)
  }, [showCoinsBanner])

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState icon="👤" title="Kein Kind ausgewählt" description="Wähle zuerst ein Kind aus, um Spiele zu spielen und Goldmünzen zu sammeln."
          action={<Link href="/"><Button>Zur Startseite</Button></Link>} />
      </AppShell>
    )
  }

  const onNextGame = undefined
  // Kein Wechsel zu anderen Spielen vom Abschlussbildschirm – nur „Zurück zu den Spielen“ und „Nochmal spielen“

  if (activeGame) {
    return (
      <AppShell>
        <CelebrationOverlay trigger={celebration.active} points={celebration.amount} message={celebration.message}
          onComplete={() => setCelebration((c) => ({ ...c, active: false }))} enableConfetti={state.settings.showConfetti} variant="coins" />
        <div className="px-4 py-4">
          <Button variant="ghost" size="sm" className="mb-4 gap-2"
            onClick={() => { setActiveGame(null); setCelebration({ active: false, amount: 0, message: "" }); setShowCoinsBanner(false) }}>
            <ArrowLeft className="w-4 h-4" />Zurück zu den Spielen
          </Button>
          {showCoinsBanner && celebration.amount > 0 && (
            <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pb-1 pointer-events-none sm:px-6" role="status" aria-live="polite">
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-500 px-5 py-3.5 text-amber-950 shadow-xl ring-4 ring-amber-500/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <GoldCoinIcon size={34} className="drop-shadow-md shrink-0" />
                <span className="font-[var(--font-fredoka)] text-xl font-bold">+{celebration.amount} Goldmünzen</span>
              </div>
            </div>
          )}
          {activeGame === "reaction" && <ReactionGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "memory" && <MemoryGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "tap" && <TapGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "color" && <ColorClickGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "math" && <MathQuestGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "word" && <WordBuilderGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "mole" && <MoleDashGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "chess" && <ChessGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
          {activeGame === "dame" && <DameGame onAwardPoints={awardGoldCoins} onClose={() => setActiveGame(null)} onNextGame={onNextGame} />}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground">Spiele</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-lg"
            onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
            aria-label={viewMode === "list" ? "Kachelansicht" : "Listenansicht"}
          >
            {viewMode === "list" ? <Grid2x2 className="w-6 h-6" /> : <List className="w-6 h-6" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Sammle Goldmünzen – nur in Spielen! Jede Runde und jedes Level zählt.</p>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
          <GoldCoinIcon size={26} className="drop-shadow-sm" />
          <span className="text-sm font-medium text-foreground">{selectedChild.name}: <strong>{selectedChild.gameGoldCoins ?? 0} Goldmünzen</strong></span>
        </div>

        {viewMode === "list" ? (
          <div className="grid gap-4">
            {gamesToShow.map((game, index) => {
              const Icon = game.icon
              const progress = gameLevels[game.id as ConcreteGameId]
              const lvl = progress?.level ?? 1
              const xpPct = progress?.xpPercent ?? 0
              return (
                <Card key={game.id} className="cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/30 active:scale-[0.98]" onClick={() => setActiveGame(game.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg">{game.title}</CardTitle>
                        <CardDescription>{game.description}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveGame(index, "up")} disabled={index === 0} aria-label="Nach oben">
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveGame(index, "down")} disabled={index === gamesToShow.length - 1} aria-label="Nach unten">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GoldCoinIcon size={18} />{game.coinsHint}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/90">
                        <span>Level {lvl}/50</span>
                        <span>Bonus bei 10/20/30/40/50</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${xpPct}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gamesToShow.map((game) => {
              const Icon = game.icon
              const progress = gameLevels[game.id as ConcreteGameId]
              const lvl = progress?.level ?? 1
              const xpPct = progress?.xpPercent ?? 0
              return (
                <Card
                  key={game.id}
                  className="cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/30 active:scale-[0.97] overflow-hidden"
                  onClick={() => setActiveGame(game.id)}
                >
                  <div className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <p className="font-semibold text-sm text-foreground leading-tight">{game.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{game.description}</p>
                    <div className="w-full mt-1 space-y-1">
                      <p className="text-[10px] text-muted-foreground/80">Level {lvl}/50</p>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${xpPct}%` }} />
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
