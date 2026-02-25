"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Clock, ChevronUp, ChevronDown, Edit2 } from "lucide-react"

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label?: string
  minTime?: string
  maxTime?: string
}

export function TimePicker({ value, onChange, label, minTime, maxTime }: TimePickerProps) {
  const [hours, setHours] = useState(8)
  const [minutes, setMinutes] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDirectInput, setIsDirectInput] = useState(false)
  const [directHours, setDirectHours] = useState("")
  const [directMinutes, setDirectMinutes] = useState("")

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map(Number)
      setHours(h || 0)
      setMinutes(m || 0)
    }
  }, [value])

  const updateTime = (newHours: number, newMinutes: number) => {
    const h = Math.max(0, Math.min(23, newHours))
    const m = Math.max(0, Math.min(59, newMinutes))
    setHours(h)
    setMinutes(m)
    onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
  }

  const handleDirectInput = () => {
    const h = Number.parseInt(directHours) || 0
    const m = Number.parseInt(directMinutes) || 0
    updateTime(h, m)
    setIsDirectInput(false)
    setDirectHours("")
    setDirectMinutes("")
  }

  const incrementHours = () => updateTime(hours + 1, minutes)
  const decrementHours = () => updateTime(hours - 1, minutes)
  const incrementMinutes = () => updateTime(hours, minutes + 15)
  const decrementMinutes = () => updateTime(hours, minutes - 15 < 0 ? 45 : minutes - 15)

  const presets = [
    { label: "Morgens", time: "07:00" },
    { label: "Mittags", time: "12:00" },
    { label: "Nachmittags", time: "15:00" },
    { label: "Abends", time: "19:00" },
  ]

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl",
          "bg-secondary hover:bg-secondary/80 transition-all",
          "border-2 border-transparent focus:border-primary",
        )}
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-xl font-bold font-mono">
            {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}
          </span>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="p-4 rounded-xl bg-card border border-border shadow-lg space-y-4 animate-in slide-in-from-top-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsDirectInput(!isDirectInput)
                if (!isDirectInput) {
                  setDirectHours(hours.toString())
                  setDirectMinutes(minutes.toString())
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                isDirectInput ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80",
              )}
            >
              <Edit2 className="h-3 w-3" />
              Direkt eingeben
            </button>
          </div>

          {isDirectInput ? (
            <div className="space-y-4">
              <div className="flex justify-center items-center gap-4">
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={directHours}
                    onChange={(e) => setDirectHours(e.target.value)}
                    className="w-20 text-4xl font-bold font-mono text-center bg-secondary rounded-xl px-2 py-3 border-2 border-transparent focus:border-primary outline-none"
                    placeholder="00"
                  />
                  <span className="text-xs text-muted-foreground mt-1">Stunden</span>
                </div>
                <span className="text-4xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={directMinutes}
                    onChange={(e) => setDirectMinutes(e.target.value)}
                    className="w-20 text-4xl font-bold font-mono text-center bg-secondary rounded-xl px-2 py-3 border-2 border-transparent focus:border-primary outline-none"
                    placeholder="00"
                  />
                  <span className="text-xs text-muted-foreground mt-1">Minuten</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDirectInput}
                className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
              >
                Uebernehmen
              </button>
            </div>
          ) : (
            <>
              {/* Spinner Controls */}
              <div className="flex justify-center items-center gap-4">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={incrementHours}
                    className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                  >
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <div className="text-4xl font-bold font-mono py-2 w-16 text-center">
                    {hours.toString().padStart(2, "0")}
                  </div>
                  <button
                    type="button"
                    onClick={decrementHours}
                    className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-muted-foreground mt-1">Stunden</span>
                </div>

                <span className="text-4xl font-bold">:</span>

                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={incrementMinutes}
                    className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                  >
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <div className="text-4xl font-bold font-mono py-2 w-16 text-center">
                    {minutes.toString().padStart(2, "0")}
                  </div>
                  <button
                    type="button"
                    onClick={decrementMinutes}
                    className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-muted-foreground mt-1">Minuten</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => updateTime(Number(e.target.value), minutes)}
                  className="w-full h-3 bg-secondary rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => {
                      const [h, m] = preset.time.split(":").map(Number)
                      updateTime(h, m)
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-all",
                      value === preset.time
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
