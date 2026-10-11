"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { GoldCoinIcon } from "@/components/ui/gold-coin-icon"
import { BONUS_LEVELS } from "@/lib/game-progression"

interface LevelUpOverlayProps {
  show: boolean
  newLevel: number
  bonusCoins?: number
  onContinue: () => void
}

export function LevelUpOverlay({ show, newLevel, bonusCoins, onContinue }: LevelUpOverlayProps) {
  const [visible, setVisible] = useState(false)
  const isBonusLevel = (BONUS_LEVELS as readonly number[]).includes(newLevel)

  useEffect(() => {
    if (show) setVisible(true)
  }, [show])

  const handleContinue = () => {
    setVisible(false)
    setTimeout(onContinue, 250)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative flex flex-col items-center gap-4 rounded-3xl bg-card p-8 shadow-2xl border border-border max-w-xs w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-5xl"
            >
              {isBonusLevel ? "🏆" : "⭐"}
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
            >
              {isBonusLevel ? "Bonus-Level erreicht!" : "Level Up!"}
            </motion.p>

            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 250 }}
              className="text-5xl font-[var(--font-fredoka)] font-bold text-primary"
            >
              Level {newLevel}
            </motion.p>

            {isBonusLevel && bonusCoins != null && bonusCoins > 0 && (
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2"
              >
                <GoldCoinIcon size={30} />
                <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">
                  +{bonusCoins} Goldmünzen
                </span>
              </motion.div>
            )}

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full pt-2"
            >
              <Button onClick={handleContinue} className="w-full" size="lg">
                Weiter spielen
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
