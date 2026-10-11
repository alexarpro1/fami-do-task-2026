"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Users, CheckSquare, Scale, Gift, BarChart3, Settings, Shield, Film } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import type { AdminTab } from "@/types"

interface AdminTabsProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  tabOrder?: AdminTab[]
}

const TABS_CONFIG: Record<AdminTab, { emoji: string; icon: React.ReactNode; color: string }> = {
  children: { emoji: "👶", icon: <Users className="w-6 h-6" />, color: "#FF6B6B" },
  kontrollzentrale: { emoji: "🛡️", icon: <Shield className="w-6 h-6" />, color: "#10B981" },
  tasks: { emoji: "✅", icon: <CheckSquare className="w-6 h-6" />, color: "#4ECDC4" },
  rules: { emoji: "⚖️", icon: <Scale className="w-6 h-6" />, color: "#9B59B6" },
  rewards: { emoji: "🎁", icon: <Gift className="w-6 h-6" />, color: "#F39C12" },
  videos: { emoji: "🎬", icon: <Film className="w-6 h-6" />, color: "#E11D48" },
  stats: { emoji: "📊", icon: <BarChart3 className="w-6 h-6" />, color: "#3498DB" },
  settings: { emoji: "⚙️", icon: <Settings className="w-6 h-6" />, color: "#7F8C8D" },
}

const TAB_LABEL_KEYS: Record<AdminTab, string> = {
  children: "children",
  kontrollzentrale: "kontrollzentrale",
  tasks: "tasks",
  rules: "rules",
  rewards: "shop",
  videos: "videos",
  stats: "statistics",
  settings: "settings",
}

const DEFAULT_ORDER: AdminTab[] = [
  "children",
  "kontrollzentrale",
  "tasks",
  "rules",
  "rewards",
  "videos",
  "stats",
  "settings",
]

export function AdminTabs({ activeTab, onTabChange, tabOrder }: AdminTabsProps) {
  const { t } = useTranslation()
  const orderedTabs = tabOrder ?? DEFAULT_ORDER

  const getLabel = (tabId: AdminTab) =>
    (t.adminPanel?.tabs as Record<string, string> | undefined)?.[TAB_LABEL_KEYS[tabId]] ?? tabId

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {orderedTabs.map((tabId) => {
        const tab = TABS_CONFIG[tabId]
        if (!tab) return null
        const isActive = activeTab === tabId
        const label = getLabel(tabId)

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
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
                style={{ backgroundColor: tab.color }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}

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

            <span
              className={`
              text-xs font-medium text-center leading-tight
              ${isActive ? "text-primary-foreground" : "text-foreground"}
            `}
            >
              {label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

export { TABS_CONFIG }
