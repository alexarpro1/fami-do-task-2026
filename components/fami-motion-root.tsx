"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "framer-motion"
import { useLowSpecPerformance } from "@/hooks/use-low-spec-performance"

/** Reduzierte Motion auf schwachen Geräten / Nutzerwunsch (synchron zu html.fdt-low-spec). */
export function FamiMotionRoot({ children }: { children: ReactNode }) {
  const reducedMotion = useLowSpecPerformance()

  return <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig>
}
