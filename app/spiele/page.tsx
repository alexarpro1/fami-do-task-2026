"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { useFamily } from "@/context/family-context"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CelebrationOverlay } from "@/components/effects/celebration-overlay"
import Link from "next/link"
import { Gamepad2, Zap, Brain, Hand, Palette, ArrowLeft, Star, Crown, LayoutGrid, ChevronUp, ChevronDown, Coins } from "lucide-react"
import { ReactionGame } from "@/components/games/reaction-game"
import { MemoryGame } from "@/components/games/memory-game"
import { TapGame } from "@/components/games/tap-game"
import { ColorClickGame } from "@/components/games/color-click-game"
import { ChessGame, DameGame } from "@/components/games/sdg"

export type GameId = "reaction" | "memory" | "tap" | "color" | "chess" | "dame" | null

const GAMES: { id: GameId; title: string; description: string; icon: React.ElementType; coinsHint: string }[] = [
  { id: "reaction", title: "Reaktionsspiel", description: "Klicke, sobald es grün wird!", icon: Zap, coinsHint: "Bis zu 15 Goldmünzen pro Runde" },
  { id: "memory", title: "Memory", description: "Finde die Paare.", icon: Brain, coinsHint: "20 Goldmünzen beim Gewinnen" },
  { id: "tap", title: "Tipp-Challenge", description: "Tippe 20 Mal so schnell du kannst!", icon: Hand, coinsHint: "Bis zu 15 Goldmünzen" },
  { id: "color", title: "Farb-Klick", description: "Klicke nur wenn GRÜN erscheint.", icon: Palette, coinsHint: "5 Goldmünzen pro richtiger Runde" },
  { id: "chess", title: "Schach", description: "Zwei Spieler – gewinne oder spiele unentschieden.", icon: Crown, coinsHint: "Sieg 30 Goldmünzen, Patt 10 Goldmünzen" },
  { id: "dame", title: "Dame", description: "Zwei Spieler – Steine schlagen und zur Dame krönen.", icon: LayoutGrid, coinsHint: "Sieg 25 Goldmünzen, Unentschieden 10 Goldmünzen" },
]

const DEFAULT_GAMES_ORDER: GameId[] = ["reaction", "memory", "tap", "color", "chess", "dame"]

export default function SpielePage() {
  const { selectedChild, dispatch, state } = useFamily()
  const [activeGame, setActiveGame] = useState<GameId>(null)
  const [celebration, setCelebration] = useState<{ active: boolean; amount: number; message: string }>({
    active: false,
    amount: 0,
    message: "",
  })

  const gamesOrder: GameId[] =
    state.settings?.gamesOrder &&
    Array.isArray(state.settings.gamesOrder) &&
    state.settings.gamesOrder.length === GAMES.length
      ? (state.settings.gamesOrder.filter((id: unknown): id is Exclude<GameId, null> =>
          typeof id === "string" &&
          (GAMES as { id: string }[]).some((g) => g.id === id)
        ) as GameId[])
      : DEFAULT_GAMES_ORDER

  const orderedGames = gamesOrder
    .map((id) => GAMES.find((g) => g.id === id))
    .filter((g): g is (typeof GAMES)[number] => g != null)

  const missingFromOrder = GAMES.filter((g) => !gamesOrder.includes(g.id!))
  const gamesToShow = [...orderedGames, ...missingFromOrder]

  const moveGame = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= gamesToShow.length) return
    const ids = gamesToShow.map((g) => g.id!)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    dispatch({ type: "UPDATE_SETTINGS", payload: { gamesOrder: ids } })
  }

  /** Vergibt Goldmünzen (nur für Spiele) – eigenes Belohnungssystem, keine Punkte. */
  const awardGoldCoins = (amount: number, message: string, _reason?: string) => {
    if (!selectedChild || amount <= 0) return
    dispatch({
      type: "ADD_GOLD_COINS_FROM_GAME",
      payload: { childId: selectedChild.id, amount },
    })
    setCelebration({ active: true, amount, message })
  }

  if (!selectedChild) {
    return (
      <AppShell>
        <EmptyState
          icon="👤"
          title="Kein Kind ausgewählt"
          description="Wähle zuerst ein Kind aus, um Spiele zu spielen und Goldmünzen zu sammeln."
          action={
            <Link href="/">
              <Button>Zur Startseite</Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  if (activeGame) {
    return (
      <AppShell>
        <CelebrationOverlay
          trigger={celebration.active}
          points={celebration.amount}
          message={celebration.message}
          onComplete={() => setCelebration((c) => ({ ...c, active: false }))}
          enableConfetti={state.settings.showConfetti}
          variant="coins"
        />
        <div className="px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-2"
            onClick={() => {
              setActiveGame(null)
              setCelebration({ active: false, amount: 0, message: "" })
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu den Spielen
          </Button>
          {activeGame === "reaction" && (
            <ReactionGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === "memory" && (
            <MemoryGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === "tap" && (
            <TapGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === "color" && (
            <ColorClickGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === "chess" && (
            <ChessGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
          {activeGame === "dame" && (
            <DameGame
              onAwardPoints={awardGoldCoins}
              onClose={() => setActiveGame(null)}
            />
          )}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 py-6">
        <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-foreground mb-1">Spiele</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Sammle Goldmünzen – nur in Spielen! Jede Runde und jedes Level zählt.
        </p>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
          <Coins className="w-5 h-5 text-amber-600 fill-amber-500" />
          <span className="text-sm font-medium text-foreground">
            {selectedChild.name}: <strong>{selectedChild.gameGoldCoins ?? 0} Goldmünzen</strong>
          </span>
        </div>
        <div className="grid gap-4">
          {gamesToShow.map((game, index) => {
            const Icon = game.icon
            return (
              <Card
                key={game.id}
                className="cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/30 active:scale-[0.98]"
                onClick={() => setActiveGame(game.id)}
              >
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveGame(index, "up")}
                        disabled={index === 0}
                        aria-label="Nach oben"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveGame(index, "down")}
                        disabled={index === gamesToShow.length - 1}
                        aria-label="Nach unten"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {game.coinsHint}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
