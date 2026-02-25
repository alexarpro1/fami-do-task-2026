"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Eye, EyeOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PinLoginProps {
  correctPin: string
  onSuccess: () => void
  onCancel?: () => void
  title?: string
  subtitle?: string
}

export function PinLogin({
  correctPin,
  onSuccess,
  onCancel,
  title = "Admin-Bereich",
  subtitle = "Bitte PIN eingeben",
}: PinLoginProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", ""])
  const [error, setError] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError(false)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check PIN when all digits entered
    if (newPin.every((d) => d !== "") && index === 3) {
      const enteredPin = newPin.join("")
      if (enteredPin === correctPin) {
        onSuccess()
      } else {
        setError(true)
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setPin(["", "", "", ""])
          inputRefs.current[0]?.focus()
        }, 500)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleNumberPad = (num: string) => {
    const firstEmpty = pin.findIndex((d) => d === "")
    if (firstEmpty !== -1) {
      handleChange(firstEmpty, num)
    }
  }

  const handleBackspace = () => {
    const lastFilled = pin
      .map((d, i) => (d !== "" ? i : -1))
      .filter((i) => i !== -1)
      .pop()
    if (lastFilled !== undefined) {
      const newPin = [...pin]
      newPin[lastFilled] = ""
      setPin(newPin)
      inputRefs.current[lastFilled]?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* PIN Input */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-3 mb-6"
        >
          {pin.map((digit, index) => (
            <div key={index} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`
                  w-14 h-16 text-center text-2xl font-bold rounded-xl
                  border-2 transition-all duration-200 bg-card
                  ${
                    error
                      ? "border-destructive bg-destructive/10"
                      : digit
                        ? "border-primary bg-primary/5"
                        : "border-border"
                  }
                  focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                `}
              />
              {digit && !showPin && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 rounded-full bg-foreground" />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Show/Hide Toggle */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPin ? "PIN verbergen" : "PIN anzeigen"}
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center text-destructive text-sm mb-4"
            >
              Falscher PIN. Bitte erneut versuchen.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPad(String(num))}
              className="h-14 rounded-xl text-xl font-semibold
                active:scale-95 transition-all text-foreground
                hover:opacity-80 border border-[rgba(185,4,4,1)] 
                bg-[rgba(255,250,250,1)]
                dark:border-primary/60 dark:bg-card/80
                dark:hover:bg-secondary/50"
              style={{
                borderWidth: '1px',
                borderImage: 'none',
              }}
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space */}
          <button
            onClick={() => handleNumberPad("0")}
            className="h-14 rounded-xl text-xl font-semibold
              active:scale-95 transition-all text-foreground
              hover:opacity-80 border border-[rgba(185,4,4,1)] 
              bg-[rgba(255,250,250,1)]
              dark:border-primary/60 dark:bg-card/80
              dark:hover:bg-secondary/50"
            style={{
              borderWidth: '1px',
              borderImage: 'none',
            }}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-xl text-xl font-semibold
              active:scale-95 transition-all text-foreground
              hover:opacity-80 border border-[rgba(185,4,4,1)] 
              bg-[rgba(255,250,250,1)]
              dark:border-primary/60 dark:bg-card/80
              dark:hover:bg-secondary/50"
            style={{
              borderWidth: '1px',
              borderImage: 'none',
            }}
          >
            ←
          </button>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full rounded-xl">
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
        )}

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">Standard-PIN: 1234</p>
      </motion.div>
    </div>
  )
}
