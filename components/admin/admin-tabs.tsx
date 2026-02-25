"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Users, CheckSquare, Scale, Gift, BarChart3, Settings } from "lucide-react"
import type { AdminTab } from "@/types"

interface AdminTabsProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  tabOrder?: AdminTab[]
}

const TABS_CONFIG: Record<AdminTab, { label: string; emoji: string; icon: React.ReactNode; color: string }> = {
  children: {
    label: "Kinder",
    emoji: "👶",
    icon: <Users className="w-6 h-6" />,
    color: "#FF6B6B",
  },
  tasks: {
    label: "Aufgaben",
    emoji: "✅",
    icon: <CheckSquare className="w-6 h-6" />,
    color: "#4ECDC4",
  },
  rules: {
    label: "Regeln",
    emoji: "⚖️",
    icon: <Scale className="w-6 h-6" />,
    color: "#9B59B6",
  },
  rewards: {
    label: "Shop",
    emoji: "🎁",
    icon: <Gift className="w-6 h-6" />,
    color: "#F39C12",
  },
  stats: {
    label: "Statistik",
    emoji: "📊",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "#3498DB",
  },
  settings: {
    label: "Einstellungen",
    emoji: "⚙️",
    icon: <Settings className="w-6 h-6" />,
    color: "#7F8C8D",
  },
}

const DEFAULT_ORDER: AdminTab[] = ["children", "tasks", "rules", "rewards", "stats", "settings"]

export function AdminTabs({ activeTab, onTabChange, tabOrder }: AdminTabsProps) {
  const orderedTabs = tabOrder ?? DEFAULT_ORDER

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {orderedTabs.map((tabId) => {
        const tab = TABS_CONFIG[tabId]
        if (!tab) return null
        const isActive = activeTab === tabId

        return (
          <motion.button
            key={tabId}
            onClick={() => onTabChange(tabId)}
            whileTap={{ scale: 0.95 }}
            className={`
              relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
              transition-all duration-200 min-h-[90px]
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card hover:bg-accent text-foreground neu-flat"
              }
            `}
          >
            {/* Colored accent bar on top when active */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
                style={{ backgroundColor: tab.color }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}

            {/* Icon with colored background circle */}
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full transition-colors
                ${isActive ? "bg-white/20" : ""}
              `}
              style={{
                backgroundColor: isActive ? undefined : `${tab.color}20`,
                color: isActive ? "currentColor" : tab.color,
              }}
            >
              <span className="text-xl">{tab.emoji}</span>
            </div>

            {/* Label */}
            <span
              className={`
              text-xs font-medium text-center leading-tight
              ${isActive ? "text-primary-foreground" : "text-foreground"}
            `}
            >
              {tab.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

export { TABS_CONFIG }
