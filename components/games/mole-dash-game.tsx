"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { applyXpAndGetBonuses, getLevelProgress, getNextBonusLevel } from "@/lib/game-progression"
import { getMoleDifficulty } from "@/lib/game-difficulty"
import { LevelUpOverlay } from "./level-up-overlay"

const STORAGE_KEY = "famiapp-mole-progress"
const COINS_PER_HIT = 3
const COMBO_THRESHOLD = 3
const COMBO_BONUS = 5
const XP_PER_HIT = 6
const XP_PER_LEVEL = 100
const GAME_ID = "mole" as const

interface MoleDashGameProps {
  onAwardPoints: (points: number, message: string) => void
  onClose: () => void
  onNextGame?: () => void
}

type MoleState = "hidden" | "active" | "hit" | "missed"

export function MoleDashGame({ onAwardPoints, onClose, onNextGame }: MoleDashGameProps) {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const bonusClaimedRef = useRef<number[]>([])
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number; bonus: number }>({ show: false, level: 0, bonus: 0 })

  const diff = getMoleDifficulty(level)
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle")
  const [holes, setHoles] = useState<MoleState[]>(() => Array(diff.gridSize).fill("hidden"))
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [combo, setCombo] = useState(0)
  const [roundsPlayed, setRoundsPlayed] = useState(0)
  const [totalCoins, setTotalCoins] = useState(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  const pausedStateRef = useRef<{ roundsPlayed: number; holes: MoleState[] } | null>(null)

  const { xpInCurrentLevel, xpForNextLevel, nextLevel } = getLevelProgress(xp, XP_PER_LEVEL)
  const nextBonusLevel = getNextBonusLevel(GAME_ID, level)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setLevel(typeof parsed.level === "number" && parsed.level > 0 ? parsed.level : 1)
        setXp(typeof parsed.xp === "number" && parsed.xp >= 0 ? parsed.xp : 0)
        if (Array.isArray(parsed.bonusClaimedLevels)) bonusClaimedRef.current = parsed.bonusClaimedLevels.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
      }
    } catch { /* ignore */ }
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []
  }, [])

  const spawnMoles = useCallback((roundNum: number, d: ReturnType<typeof getMoleDifficulty>, currentHoles: MoleState[]) => {
    if (roundNum >= d.rounds) {
      const t = setTimeout(() => setPhase("done"), 500)
      timeoutRefs.current.push(t)
      return
    }

    const available = currentHoles.map((s, i) => (s === "hidden" ? i : -1)).filter((i) => i >= 0)
    const toActivate = available.sort(() => Math.random() - 0.5).slice(0, Math.min(d.concurrentMoles, available.length))

    setHoles((prev) => {
      const next = [...prev]
      toActivate.forEach((i) => { next[i] = "active" })
      return next
    })

    toActivate.forEach((idx) => {
      const t = setTimeout(() => {
        setHoles((prev) => {
          if (prev[idx] !== "active") return prev
          const next = [...prev]
          next[idx] = "missed"
          setMisses((m) => m + 1)
          setCombo(0)
          setTimeout(() => {
            setHoles((p) => {
              const n = [...p]; n[idx] = "hidden"; return n
            })
          }, 300)
          return next
        })
      }, d.activeDurationMs)
      timeoutRefs.current.push(t)
    })

    const nextSpawn = setTimeout(() => {
      setRoundsPlayed(roundNum + 1)
      setHoles((prev) => {
        spawnMoles(roundNum + 1, d, prev)
        return prev
      })
    }, d.activeDurationMs + d.pauseDurationMs)
    timeoutRefs.current.push(nextSpawn)
  }, [])

  const startGame = useCallback(() => {
    clearAllTimeouts()
    const d = getMoleDifficulty(level)
    const initial = Array(d.gridSize).fill("hidden") as MoleState[]
    setHoles(initial); setHits(0); setMisses(0); setCombo(0); setRoundsPlayed(0); setTotalCoins(0)
    setPhase("playing")
    const t = setTimeout(() => spawnMoles(0, d, initial), 600)
    timeoutRefs.current.push(t)
  }, [level, clearAllTimeouts, spawnMoles])

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts])

  useEffect(() => {
    if (levelUp.show && phase === "playing") {
      clearAllTimeouts()
      pausedStateRef.current = { roundsPlayed, holes: [...holes] }
    }
  }, [levelUp.show, phase, roundsPlayed, holes, clearAllTimeouts])

  const handleLevelUpContinue = useCallback(() => {
    setLevelUp((p) => ({ ...p, show: false }))
    const paused = pausedStateRef.current
    if (paused && phase === "playing") {
      pausedStateRef.current = null
      const d = getMoleDifficulty(level)
      const t = setTimeout(() => spawnMoles(paused.roundsPlayed, d, paused.holes), 100)
      timeoutRefs.current.push(t)
    }
  }, [phase, level, spawnMoles])

  const handleHit = useCallback((idx: number) => {
    if (phase !== "playing" || holes[idx] !== "active") return
    setHoles((prev) => {
      const next = [...prev]; next[idx] = "hit"; return next
    })
    setHits((h) => h + 1)
    const newCombo = combo + 1
    setCombo(newCombo)

    let coins = COINS_PER_HIT
    let msg = "Treffer! 🎯"
    if (newCombo >= COMBO_THRESHOLD && newCombo % COMBO_THRESHOLD === 0) {
      coins += COMBO_BONUS
      msg = `${newCombo}er Combo! 🔥 +${COMBO_BONUS} Bonus`
    }
    setTotalCoins((c) => c + coins)
    onAwardPoints(coins, msg)

    setXp((prevXp) => {
      const result = applyXpAndGetBonuses(GAME_ID, { xp: prevXp, level, bonusClaimedLevels: bonusClaimedRef.current }, XP_PER_HIT, XP_PER_LEVEL)
      bonusClaimedRef.current = result.bonusClaimedLevels
      setLevel(result.level)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: result.level, xp: result.xp, bonusClaimedLevels: result.bonusClaimedLevels })) } catch { /* ignore */ }
      if (result.bonusCoins > 0) onAwardPoints(result.bonusCoins, `Bonus: Level ${result.newBonusLevels.join(", ")} erreicht!`)
      if (result.leveledUp) setLevelUp({ show: true, level: result.level, bonus: result.bonusCoins })
      return result.xp
    })

    setTimeout(() => setHoles((prev) => { const next = [...prev]; next[idx] = "hidden"; return next }), 250)
  }, [phase, holes, combo, onAwardPoints, level])

  const xpPercent = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100)) : 100

  if (phase === "done") {
    return (
      <div className="space-y-6 text-center py-8">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="text-6xl mb-3">{hits > misses ? "🏆" : "👍"}</p>
          <p className="text-3xl font-bold text-foreground">{hits} Treffer!</p>
          <p className="text-lg font-semibold text-primary mt-1">+{totalCoins} Goldmünzen</p>
        </motion.div>
        <p className="text-base text-muted-foreground font-medium">Level {level} · {misses} verpasst</p>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onClose} variant="outline" size="lg" className="text-base bg-primary/10 hover:bg-primary/15 text-primary border-primary/20">Zurück zu den Spielen</Button>
          <Button onClick={startGame} variant="outline" size="lg" className="text-base">Nochmal spielen</Button>
          <Button onClick={() => setPhase("idle")} size="lg" className="text-base">Weiter</Button>
        </div>
      </div>
    )
  }

  if (phase === "idle") {
    return (
      <div className="space-y-5">
        <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Triff die Maulwürfe!</p>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>XP {xpInCurrentLevel}/{xpForNextLevel || "Max"}</span>
            {nextBonusLevel && nextBonusLevel > level && <span>Bonus bei Level {nextBonusLevel}</span>}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{COINS_PER_HIT} Goldmünzen pro Treffer</p>
          <p>+{COMBO_BONUS} Bonus für {COMBO_THRESHOLD}er Combo</p>
          <p>{diff.rounds} Runden · {diff.concurrentMoles} gleichzeitig</p>
        </div>
        <Button className="w-full" size="lg" onClick={startGame}>Start</Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <LevelUpOverlay show={levelUp.show} newLevel={levelUp.level} bonusCoins={levelUp.bonus} onContinue={handleLevelUpContinue} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hits} Treffer {combo >= COMBO_THRESHOLD && <span className="text-primary font-bold">· {combo}er Combo 🔥</span>}
        </p>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
      </div>

      <div className={cn(
        "grid gap-3 mx-auto max-w-[20rem]",
        diff.gridCols === 3 ? "grid-cols-3" : "grid-cols-4",
      )}>
        {holes.map((state, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleHit(i)}
            className={cn(
              "aspect-square rounded-2xl border-2 flex items-center justify-center transition-colors relative overflow-hidden",
              state === "hidden" && "bg-amber-900/20 border-amber-800/30",
              state === "active" && "bg-amber-100 border-amber-400 dark:bg-amber-900/60 dark:border-amber-500",
              state === "hit" && "bg-green-500/20 border-green-400",
              state === "missed" && "bg-red-500/10 border-red-300",
            )}
          >
            <AnimatePresence>
              {state === "active" && (
                <motion.span
                  initial={{ y: 20, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 10, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="text-3xl select-none"
                >
                  🐹
                </motion.span>
              )}
              {state === "hit" && (
                <motion.span
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-2xl"
                >
                  ⭐
                </motion.span>
              )}
              {state === "missed" && (
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ y: 15, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl"
                >
                  🐹
                </motion.span>
              )}
            </AnimatePresence>
            {state === "hidden" && (
              <div className="w-8 h-3 rounded-full bg-amber-900/30 dark:bg-amber-700/30" />
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">{totalCoins} Goldmünzen</p>
      <Button variant="outline" className="w-full" onClick={onClose}>Beenden</Button>
    </div>
  )
}
