// ============================================
// FAMILY CONTEXT - GLOBAL STATE MANAGEMENT
// ============================================

"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef, useState } from "react"
import type {
  FamilyState,
  FamilyAction,
  Child,
  Task,
  Reward,
  Rule,
  Pet,
  TaskCompletion,
  MoodEntry,
  PointAdjustment,
  RewardRedemption,
} from "@/types"
import { normalizeStoredLanguage } from "@/lib/i18n"
import { getPersistedStateRaw, setPersistedStateRaw } from "@/lib/persistent-state"
import { isNativeApp } from "@/lib/device"
import {
  DEFAULT_SETTINGS,
  DEFAULT_MORNING_TASKS,
  DEFAULT_EVENING_TASKS,
  DEFAULT_WEEKEND_TASKS,
  DEFAULT_REWARDS,
  DEFAULT_RULES,
  generateId,
  PET_EVOLUTION_XP,
} from "@/lib/constants"
// import { useFamiSync } from "@/hooks/useFamiSync" // Removed useFamiSync call

// Storage Key
const STORAGE_KEY = "famiapp-state"

function getDeviceId(): string {
  if (typeof window === "undefined") return ""
  let deviceId = localStorage.getItem("famiapp-device-id")
  if (!deviceId) {
    deviceId = `device-${generateId()}`
    localStorage.setItem("famiapp-device-id", deviceId)
  }
  return deviceId
}

const INITIAL_STATE: FamilyState = {
  children: [],
  tasks: [],
  taskCompletions: [],
  rewards: [],
  rewardRedemptions: [],
  rules: [],
  ruleApplications: [],
  pointAdjustments: [],
  pets: [],
  stickerCollections: [],
  settings: DEFAULT_SETTINGS,
  selectedChildId: null,
  lastUpdated: new Date().toISOString(),
  moodEntries: [],
  weather: null,
  schoolTimes: [],
  achievements: [],
}

// Helper: Create initial tasks with IDs
function createInitialTasks(): Task[] {
  const allTasks = [...DEFAULT_MORNING_TASKS, ...DEFAULT_EVENING_TASKS, ...DEFAULT_WEEKEND_TASKS]
  return allTasks.map((task, index) => ({
    ...task,
    id: generateId(),
    order: index,
  }))
}

// Helper: Create initial rewards with IDs
function createInitialRewards(): Reward[] {
  return DEFAULT_REWARDS.map((reward) => ({
    ...reward,
    id: generateId(),
  }))
}

// Helper: Create initial rules with IDs
function createInitialRules(): Rule[] {
  return DEFAULT_RULES.map((rule) => ({
    ...rule,
    id: generateId(),
  }))
}

// Reducer Function
function familyReducer(state: FamilyState, action: FamilyAction): FamilyState {
  const now = new Date().toISOString()

  switch (action.type) {
    case "ADD_CHILD": {
      const newChild: Child = {
        ...action.payload,
        id: generateId(),
        points: 0,
        totalPointsEarned: 0,
        createdAt: now,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        gameGoldCoins: 0,
      }
      const nextChildren = [...(state.children || []), newChild]
      const nextChildOrder = [...(state.settings.childOrder ?? (state.children || []).map((c) => c.id)), newChild.id]
      return {
        ...state,
        children: nextChildren,
        settings: { ...state.settings, childOrder: nextChildOrder },
        lastUpdated: now,
      }
    }

    case "UPDATE_CHILD": {
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.id ? { ...child, ...action.payload.updates } : child,
        ),
        lastUpdated: now,
      }
    }

    case "DELETE_CHILD": {
      const nextChildOrder = (state.settings.childOrder ?? (state.children || []).map((c) => c.id)).filter(
        (id) => id !== action.payload,
      )
      return {
        ...state,
        children: (state.children || []).filter((child) => child.id !== action.payload),
        settings: { ...state.settings, childOrder: nextChildOrder.length ? nextChildOrder : undefined },
        taskCompletions: (state.taskCompletions || []).filter((tc) => tc.childId !== action.payload),
        rewardRedemptions: (state.rewardRedemptions || []).filter((rr) => rr.childId !== action.payload),
        ruleApplications: (state.ruleApplications || []).filter((ra) => ra.childId !== action.payload),
        pets: (state.pets || []).filter((pet) => pet.childId !== action.payload),
        stickerCollections: (state.stickerCollections || []).filter((sc) => sc.childId !== action.payload),
        selectedChildId: state.selectedChildId === action.payload ? null : state.selectedChildId,
        lastUpdated: now,
      }
    }

    case "SELECT_CHILD": {
      return { ...state, selectedChildId: action.payload, lastUpdated: now }
    }

    case "ADD_POINTS": {
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                points: child.points + action.payload.points,
                totalPointsEarned: child.totalPointsEarned + action.payload.points,
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "SUBTRACT_POINTS": {
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? { ...child, points: Math.max(0, child.points - action.payload.points) }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "ADJUST_POINTS": {
      const adjustment: PointAdjustment = {
        id: crypto.randomUUID(),
        childId: action.payload.childId,
        amount: action.payload.amount,
        reason: action.payload.reason,
        adjustedAt: now,
        adjustedBy: "admin",
      }
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                points: Math.max(0, child.points + action.payload.amount),
                totalPointsEarned:
                  action.payload.amount > 0 ? child.totalPointsEarned + action.payload.amount : child.totalPointsEarned,
              }
            : child,
        ),
        pointAdjustments: [...(state.pointAdjustments || []), adjustment],
        lastUpdated: now,
      }
    }

    case "ADD_POINTS_FROM_GAME": {
      const adjustment: PointAdjustment = {
        id: crypto.randomUUID(),
        childId: action.payload.childId,
        amount: action.payload.amount,
        reason: action.payload.reason,
        adjustedAt: now,
        adjustedBy: "game",
      }
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                points: child.points + action.payload.amount,
                totalPointsEarned: child.totalPointsEarned + action.payload.amount,
              }
            : child,
        ),
        pointAdjustments: [...(state.pointAdjustments || []), adjustment],
        lastUpdated: now,
      }
    }

    case "ADD_GOLD_COINS_FROM_GAME": {
      const amount = action.payload.amount
      if (amount <= 0) return state
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                gameGoldCoins: (child.gameGoldCoins ?? 0) + amount,
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "ADD_TASK": {
      const newTask: Task = { ...action.payload, id: generateId(), order: (state.tasks || []).length }
      return { ...state, tasks: [...(state.tasks || []), newTask], lastUpdated: now }
    }

    case "UPDATE_TASK": {
      return {
        ...state,
        tasks: (state.tasks || []).map((task) =>
          task.id === action.payload.id ? { ...task, ...action.payload.updates } : task,
        ),
        lastUpdated: now,
      }
    }

    case "DELETE_TASK": {
      return { ...state, tasks: (state.tasks || []).filter((task) => task.id !== action.payload), lastUpdated: now }
    }

    case "COMPLETE_TASK": {
      const task = (state.tasks || []).find((t) => t.id === action.payload.taskId)
      if (!task) return state

      if (task.dailyLimit) {
        const today = new Date().toDateString()
        const todayCompletions = (state.taskCompletions || []).filter(
          (tc) =>
            tc.taskId === task.id &&
            tc.childId === action.payload.childId &&
            new Date(tc.completedAt).toDateString() === today,
        )
        if (todayCompletions.length >= task.dailyLimit) return state
      }

      const completion: TaskCompletion = {
        id: generateId(),
        taskId: action.payload.taskId,
        childId: action.payload.childId,
        completedAt: now,
        pointsEarned: task.points,
        withTimer: action.payload.withTimer,
      }

      const child = (state.children || []).find((c) => c.id === action.payload.childId)
      const todayStr = new Date().toISOString().split("T")[0]
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0]

      let newStreak = child?.currentStreak ?? 0
      let longestStreak = child?.longestStreak ?? 0

      if (child?.lastActiveDate !== todayStr) {
        // First task of today
        if (child?.lastActiveDate === yesterdayStr) {
          // Continue streak
          newStreak = (child?.currentStreak ?? 0) + 1
        } else {
          // Start new streak
          newStreak = 1
        }
        longestStreak = Math.max(longestStreak, newStreak)
      }

      const totalTasksCompleted =
        (state.taskCompletions || []).filter((tc) => tc.childId === action.payload.childId).length + 1
      const totalPointsAfter = (child?.totalPointsEarned ?? 0) + task.points
      const currentAchievements = child?.achievements ?? []
      const newAchievements: string[] = []

      // Check streak achievements
      if (newStreak >= 3 && !currentAchievements.includes("streak-3")) newAchievements.push("streak-3")
      if (newStreak >= 7 && !currentAchievements.includes("streak-7")) newAchievements.push("streak-7")
      if (newStreak >= 14 && !currentAchievements.includes("streak-14")) newAchievements.push("streak-14")
      if (newStreak >= 30 && !currentAchievements.includes("streak-30")) newAchievements.push("streak-30")

      // Check task achievements
      if (totalTasksCompleted >= 1 && !currentAchievements.includes("first-task")) newAchievements.push("first-task")
      if (totalTasksCompleted >= 10 && !currentAchievements.includes("tasks-10")) newAchievements.push("tasks-10")
      if (totalTasksCompleted >= 50 && !currentAchievements.includes("tasks-50")) newAchievements.push("tasks-50")
      if (totalTasksCompleted >= 100 && !currentAchievements.includes("tasks-100")) newAchievements.push("tasks-100")
      if (totalTasksCompleted >= 500 && !currentAchievements.includes("tasks-500")) newAchievements.push("tasks-500")

      // Check points achievements
      if (totalPointsAfter >= 100 && !currentAchievements.includes("points-100")) newAchievements.push("points-100")
      if (totalPointsAfter >= 500 && !currentAchievements.includes("points-500")) newAchievements.push("points-500")
      if (totalPointsAfter >= 1000 && !currentAchievements.includes("points-1000")) newAchievements.push("points-1000")
      if (totalPointsAfter >= 5000 && !currentAchievements.includes("points-5000")) newAchievements.push("points-5000")

      // Check time-based achievements
      const hour = new Date().getHours()
      if (hour < 7 && !currentAchievements.includes("early-bird")) newAchievements.push("early-bird")
      if (hour >= 20 && !currentAchievements.includes("night-owl")) newAchievements.push("night-owl")

      const pet = (state.pets || []).find((p) => p.childId === action.payload.childId)
      let updatedPets = state.pets || []
      if (pet) {
        const newXp = pet.xp + Math.floor(task.points / 2)
        let newLevel = pet.level
        let newEvolutionStage = pet.evolutionStage
        let xpToNext = pet.xpToNextLevel

        if (newXp >= xpToNext) {
          newLevel++
          xpToNext = newLevel * 50
          const nextStage = (pet.evolutionStage + 1) as 1 | 2 | 3 | 4 | 5
          if (nextStage <= 5 && newLevel >= (PET_EVOLUTION_XP[nextStage] || Number.POSITIVE_INFINITY)) {
            newEvolutionStage = nextStage
          }
        }

        updatedPets = (state.pets || []).map((p) =>
          p.id === pet.id
            ? {
                ...p,
                xp: newXp,
                level: newLevel,
                evolutionStage: newEvolutionStage,
                xpToNextLevel: xpToNext,
                mood: "happy" as const,
              }
            : p,
        )
      }

      return {
        ...state,
        taskCompletions: [...(state.taskCompletions || []), completion],
        tasks: (state.tasks || []).map((t) =>
          t.id === action.payload.taskId ? { ...t, usageCount: (t.usageCount ?? 0) + 1 } : t,
        ),
        children: (state.children || []).map((c) =>
          c.id === action.payload.childId
            ? {
                ...c,
                points: c.points + task.points,
                totalPointsEarned: c.totalPointsEarned + task.points,
                currentStreak: newStreak,
                longestStreak: longestStreak,
                lastActiveDate: todayStr,
                achievements: [...currentAchievements, ...newAchievements],
              }
            : c,
        ),
        pets: updatedPets,
        lastUpdated: now,
      }
    }

    case "UNCOMPLETE_TASK": {
      const completion = (state.taskCompletions || []).find((tc) => tc.id === action.payload.completionId)
      if (!completion) return state

      return {
        ...state,
        taskCompletions: (state.taskCompletions || []).filter((tc) => tc.id !== action.payload.completionId),
        children: (state.children || []).map((child) =>
          child.id === completion.childId
            ? {
                ...child,
                points: Math.max(0, child.points - completion.pointsEarned),
                totalPointsEarned: Math.max(0, child.totalPointsEarned - completion.pointsEarned),
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "ADD_REWARD": {
      const newReward: Reward = { ...action.payload, id: generateId() }
      return { ...state, rewards: [...(state.rewards || []), newReward], lastUpdated: now }
    }

    case "UPDATE_REWARD": {
      return {
        ...state,
        rewards: (state.rewards || []).map((reward) =>
          reward.id === action.payload.id ? { ...reward, ...action.payload.updates } : reward,
        ),
        lastUpdated: now,
      }
    }

    case "DELETE_REWARD": {
      return {
        ...state,
        rewards: (state.rewards || []).filter((reward) => reward.id !== action.payload),
        lastUpdated: now,
      }
    }

    case "REDEEM_REWARD": {
      const reward = (state.rewards || []).find((r) => r.id === action.payload.rewardId)
      if (!reward) return state

      const child = (state.children || []).find((c) => c.id === action.payload.childId)
      if (!child || child.points < reward.cost) return state

      const redemption: RewardRedemption = {
        id: generateId(),
        rewardId: action.payload.rewardId,
        childId: action.payload.childId,
        redeemedAt: now,
        pointsSpent: reward.cost,
      }

      const totalPurchases =
        (state.rewardRedemptions || []).filter((r) => r.childId === action.payload.childId).length + 1
      const currentAchievements = child.achievements ?? []
      const newAchievements: string[] = []

      if (totalPurchases >= 1 && !currentAchievements.includes("shop-1")) newAchievements.push("shop-1")
      if (totalPurchases >= 10 && !currentAchievements.includes("shop-10")) newAchievements.push("shop-10")
      if (totalPurchases >= 25 && !currentAchievements.includes("shop-25")) newAchievements.push("shop-25")

      return {
        ...state,
        rewardRedemptions: [...(state.rewardRedemptions || []), redemption],
        rewards: (state.rewards || []).map((r) =>
          r.id === action.payload.rewardId
            ? {
                ...r,
                stock: r.stock !== undefined ? r.stock - 1 : undefined,
                purchaseCount: (r.purchaseCount ?? 0) + 1,
              }
            : r,
        ),
        children: (state.children || []).map((c) =>
          c.id === action.payload.childId
            ? {
                ...c,
                points: c.points - reward.cost,
                achievements: [...currentAchievements, ...newAchievements],
              }
            : c,
        ),
        lastUpdated: now,
      }
    }

    case "ADD_RULE": {
      const newRule: Rule = { ...action.payload, id: generateId() }
      return { ...state, rules: [...(state.rules || []), newRule], lastUpdated: now }
    }

    case "UPDATE_RULE": {
      return {
        ...state,
        rules: (state.rules || []).map((rule) =>
          rule.id === action.payload.id ? { ...rule, ...action.payload.updates } : rule,
        ),
        lastUpdated: now,
      }
    }

    case "DELETE_RULE": {
      return { ...state, rules: (state.rules || []).filter((rule) => rule.id !== action.payload), lastUpdated: now }
    }

    case "APPLY_RULE": {
      const rule = (state.rules || []).find((r) => r.id === action.payload.ruleId)
      if (!rule) return state

      if (rule.dailyLimit) {
        const today = new Date().toDateString()
        const todayApplications = (state.ruleApplications || []).filter(
          (ra) =>
            ra.ruleId === rule.id &&
            ra.childId === action.payload.childId &&
            new Date(ra.appliedAt).toDateString() === today,
        )
        if (todayApplications.length >= rule.dailyLimit) return state
      }

      return {
        ...state,
        ruleApplications: [
          ...(state.ruleApplications || []),
          {
            id: generateId(),
            ruleId: action.payload.ruleId,
            childId: action.payload.childId,
            appliedAt: now,
            pointsChanged: rule.points,
            note: action.payload.note,
          },
        ],
        rules: (state.rules || []).map((r) =>
          r.id === action.payload.ruleId ? { ...r, usageCount: (r.usageCount ?? 0) + 1 } : r,
        ),
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                points: rule.isPositive ? child.points + rule.points : Math.max(0, child.points + rule.points),
                totalPointsEarned: rule.isPositive ? child.totalPointsEarned + rule.points : child.totalPointsEarned,
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "CREATE_PET": {
      if ((state.pets || []).find((p) => p.childId === action.payload.childId)) return state
      const newPet: Pet = {
        id: generateId(),
        childId: action.payload.childId,
        name: action.payload.name,
        type: action.payload.type,
        level: 1,
        xp: 0,
        xpToNextLevel: 50,
        mood: "happy",
        health: 100,
        lastFed: now,
        evolutionStage: 1,
      }
      return { ...state, pets: [...(state.pets || []), newPet], lastUpdated: now }
    }

    case "FEED_PET": {
      return {
        ...state,
        pets: (state.pets || []).map((pet) =>
          pet.id === action.payload.petId ? { ...pet, health: 100, mood: "happy", lastFed: now } : pet,
        ),
        lastUpdated: now,
      }
    }

    case "ADD_PET_XP": {
      return {
        ...state,
        pets: (state.pets || []).map((pet) => {
          if (pet.id !== action.payload.petId) return pet
          const newXp = pet.xp + action.payload.xp
          let newLevel = pet.level
          let xpToNext = pet.xpToNextLevel
          if (newXp >= xpToNext) {
            newLevel++
            xpToNext = newLevel * 50
          }
          return { ...pet, xp: newXp, level: newLevel, xpToNextLevel: xpToNext }
        }),
        lastUpdated: now,
      }
    }

    case "UNLOCK_STICKER": {
      const existing = (state.stickerCollections || []).find((sc) => sc.childId === action.payload.childId)
      if (existing) {
        if (existing.stickers.includes(action.payload.stickerId)) return state
        return {
          ...state,
          stickerCollections: (state.stickerCollections || []).map((sc) =>
            sc.childId === action.payload.childId
              ? { ...sc, stickers: [...sc.stickers, action.payload.stickerId] }
              : sc,
          ),
          lastUpdated: now,
        }
      }
      return {
        ...state,
        stickerCollections: [
          ...(state.stickerCollections || []),
          { childId: action.payload.childId, stickers: [action.payload.stickerId] },
        ],
        lastUpdated: now,
      }
    }

    case "ADD_MOOD": {
      const newMood: MoodEntry = {
        id: generateId(),
        childId: action.payload.childId,
        mood: action.payload.mood,
        note: action.payload.note,
        createdAt: now,
      }
      return {
        ...state,
        moodEntries: [...(state.moodEntries || []), newMood],
        lastUpdated: now,
      }
    }

    case "UPDATE_WEATHER": {
      return { ...state, weather: action.payload, lastUpdated: now }
    }

    case "SET_SCHOOL_TIME": {
      const existing = (state.schoolTimes || []).find((st) => st.childId === action.payload.childId)
      if (existing) {
        return {
          ...state,
          schoolTimes: (state.schoolTimes || []).map((st) =>
            st.childId === action.payload.childId ? action.payload : st,
          ),
          lastUpdated: now,
        }
      }
      return { ...state, schoolTimes: [...(state.schoolTimes || []), action.payload], lastUpdated: now }
    }

    case "UPDATE_SETTINGS": {
      return { ...state, settings: { ...state.settings, ...action.payload }, lastUpdated: now }
    }

    case "IMPORT_STATE": {
      console.log("[FamilyContext] Import validiert...")

      if (!action.payload || typeof action.payload !== "object") {
        console.error("[FamilyContext] Invalid import payload - not an object")
        return state
      }

      if (!Array.isArray(action.payload.children)) {
        console.error("[FamilyContext] Invalid import payload - children is not an array")
        return state
      }

      if (!Array.isArray(action.payload.tasks)) {
        console.error("[FamilyContext] Invalid import payload - tasks is not an array")
        return state
      }

      const importedState: FamilyState = {
        ...INITIAL_STATE,
        ...action.payload,
        children: Array.isArray(action.payload.children) ? action.payload.children : [],
        tasks: Array.isArray(action.payload.tasks) ? action.payload.tasks : [],
        taskCompletions: Array.isArray(action.payload.taskCompletions) ? action.payload.taskCompletions : [],
        rewards: Array.isArray(action.payload.rewards) ? action.payload.rewards : [],
        rewardRedemptions: Array.isArray(action.payload.rewardRedemptions) ? action.payload.rewardRedemptions : [],
        rules: Array.isArray(action.payload.rules) ? action.payload.rules : [],
        ruleApplications: Array.isArray(action.payload.ruleApplications) ? action.payload.ruleApplications : [],
        pointAdjustments: Array.isArray(action.payload.pointAdjustments) ? action.payload.pointAdjustments : [],
        pets: Array.isArray(action.payload.pets) ? action.payload.pets : [],
        stickerCollections: Array.isArray(action.payload.stickerCollections) ? action.payload.stickerCollections : [],
        schoolTimes: Array.isArray(action.payload.schoolTimes) ? action.payload.schoolTimes : [],
        moodEntries: Array.isArray(action.payload.moodEntries) ? action.payload.moodEntries : [],
        achievements: Array.isArray(action.payload.achievements) ? action.payload.achievements : [],
        lastUpdated: now,
      }

      console.log(
        "[FamilyContext] Import successful - children:",
        importedState.children.length,
        "tasks:",
        importedState.tasks.length,
      )
      return importedState
    }

    case "LOAD_STATE": {
      if (!action.payload || typeof action.payload !== "object") {
        console.error("[FamilyContext] Invalid load payload")
        return state
      }

      return {
        ...INITIAL_STATE,
        ...action.payload,
        children: Array.isArray(action.payload.children) ? action.payload.children : [],
        tasks: Array.isArray(action.payload.tasks) ? action.payload.tasks : [],
        taskCompletions: Array.isArray(action.payload.taskCompletions) ? action.payload.taskCompletions : [],
        rewards: Array.isArray(action.payload.rewards) ? action.payload.rewards : [],
        rewardRedemptions: Array.isArray(action.payload.rewardRedemptions) ? action.payload.rewardRedemptions : [],
        rules: Array.isArray(action.payload.rules) ? action.payload.rules : [],
        ruleApplications: Array.isArray(action.payload.ruleApplications) ? action.payload.ruleApplications : [],
        pointAdjustments: Array.isArray(action.payload.pointAdjustments) ? action.payload.pointAdjustments : [],
        pets: Array.isArray(action.payload.pets) ? action.payload.pets : [],
        stickerCollections: Array.isArray(action.payload.stickerCollections) ? action.payload.stickerCollections : [],
        schoolTimes: Array.isArray(action.payload.schoolTimes) ? action.payload.schoolTimes : [],
        moodEntries: Array.isArray(action.payload.moodEntries) ? action.payload.moodEntries : [],
        achievements: Array.isArray(action.payload.achievements) ? action.payload.achievements : [],
        lastUpdated: now,
      }
    }

    case "RESET_STATE": {
      return {
        ...INITIAL_STATE,
        tasks: createInitialTasks(),
        rewards: createInitialRewards(),
        rules: createInitialRules(),
        lastUpdated: now,
      }
    }

    case "ADD_TO_WISHLIST": {
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                wishlistRewardIds: [
                  ...(child.wishlistRewardIds || []).filter((id) => id !== action.payload.rewardId),
                  action.payload.rewardId,
                ].slice(-3), // Max 3 items
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "REMOVE_FROM_WISHLIST": {
      return {
        ...state,
        children: (state.children || []).map((child) =>
          child.id === action.payload.childId
            ? {
                ...child,
                wishlistRewardIds: (child.wishlistRewardIds || []).filter((id) => id !== action.payload.rewardId),
              }
            : child,
        ),
        lastUpdated: now,
      }
    }

    case "UNLOCK_ACHIEVEMENT": {
      return {
        ...state,
        children: (state.children || []).map((c) =>
          c.id === action.payload.childId
            ? {
                ...c,
                achievements: [...(c.achievements ?? []), action.payload.achievementId],
              }
            : c,
        ),
        lastUpdated: now,
      }
    }

    default:
      return state
  }
}

// Context Type
interface FamilyContextType {
  state: FamilyState
  dispatch: React.Dispatch<FamilyAction>
  isLoaded: boolean
  selectedChild: Child | null
  todayCompletions: TaskCompletion[]
  getTodayCompletionsForChild: (childId: string) => TaskCompletion[]
  isTaskCompletedToday: (taskId: string, childId: string) => boolean
  getTodayRuleApplications: (childId: string, ruleId: string) => number
}

// Create Context
const FamilyContext = createContext<FamilyContextType | undefined>(undefined)

// Helper: Parse stored JSON to FamilyState (für localStorage und Capacitor Preferences)
function parseStoredState(stored: string): FamilyState | null {
  try {
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== "object") return null
    const settings =
      parsed.settings && typeof parsed.settings === "object"
        ? { ...parsed.settings, language: normalizeStoredLanguage(parsed.settings.language) }
        : DEFAULT_SETTINGS
    return {
      ...parsed,
      settings,
      children: Array.isArray(parsed.children) ? parsed.children : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      taskCompletions: Array.isArray(parsed.taskCompletions) ? parsed.taskCompletions : [],
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : [],
      rewardRedemptions: Array.isArray(parsed.rewardRedemptions) ? parsed.rewardRedemptions : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      ruleApplications: Array.isArray(parsed.ruleApplications) ? parsed.ruleApplications : [],
      pointAdjustments: Array.isArray(parsed.pointAdjustments) ? parsed.pointAdjustments : [],
      pets: Array.isArray(parsed.pets) ? parsed.pets : [],
      stickerCollections: Array.isArray(parsed.stickerCollections) ? parsed.stickerCollections : [],
      schoolTimes: Array.isArray(parsed.schoolTimes) ? parsed.schoolTimes : [],
      moodEntries: Array.isArray(parsed.moodEntries) ? parsed.moodEntries : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    }
  } catch {
    return null
  }
}

function loadStateFromStorage(): FamilyState | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const state = parseStoredState(stored)
  if (!state) {
    console.error("[FamilyContext] Invalid state structure in localStorage")
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
  return state
}

// Initialize State Function
function initializeState(preloadedState: FamilyState): FamilyState {
  return (
    preloadedState || {
      ...INITIAL_STATE,
      tasks: createInitialTasks(),
      rewards: createInitialRewards(),
      rules: createInitialRules(),
    }
  )
}

// Provider Component
export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const initialState = loadStateFromStorage() || {
    ...INITIAL_STATE,
    tasks: createInitialTasks(),
    rewards: createInitialRewards(),
    rules: createInitialRules(),
  }

  const [state, dispatch] = useReducer(familyReducer, initialState, initializeState)
  const [isLoaded, setIsLoaded] = useState(false)
  const hasLoadedRef = useRef(false)

  // useFamiSync call removed

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    setIsLoaded(true)
  }, [])

  // Auf Native (Android/iOS): Beim Start aus Capacitor Preferences laden, damit Daten nach Neustart erhalten bleiben
  useEffect(() => {
    if (!isNativeApp()) return
    getPersistedStateRaw().then((raw) => {
      if (!raw) return
      const parsed = parseStoredState(raw)
      if (parsed) dispatch({ type: "LOAD_STATE", payload: parsed })
    })
  }, [])

  // State speichern: Web = localStorage, Native = zusätzlich Capacitor Preferences (persistent)
  useEffect(() => {
    setPersistedStateRaw(JSON.stringify(state)).catch((error) => {
      console.error("[FamilyContext] Error saving state:", error)
    })
  }, [state])

  const childrenInOrder = useMemo(() => {
    const list = state.children ?? []
    const order = state.settings?.childOrder
    if (!order?.length) return list
    const byId = new Map(list.map((c) => [c.id, c]))
    const ordered: Child[] = []
    for (const id of order) {
      const c = byId.get(id)
      if (c) ordered.push(c)
    }
    for (const c of list) {
      if (!order.includes(c.id)) ordered.push(c)
    }
    return ordered
  }, [state.children, state.settings?.childOrder])

  const stateWithOrderedChildren = useMemo(
    () => ({ ...state, children: childrenInOrder }),
    [state, childrenInOrder],
  )

  const selectedChild = stateWithOrderedChildren.selectedChildId
    ? (childrenInOrder).find((c) => c.id === state.selectedChildId) || null
    : null

  const today = new Date().toDateString()
  const todayCompletions = (state.taskCompletions ?? []).filter(
    (tc) => new Date(tc.completedAt).toDateString() === today,
  )

  const getTodayCompletionsForChild = useCallback(
    (childId: string) => todayCompletions.filter((tc) => tc.childId === childId),
    [todayCompletions],
  )

  const isTaskCompletedToday = useCallback(
    (taskId: string, childId: string) => todayCompletions.some((tc) => tc.taskId === taskId && tc.childId === childId),
    [todayCompletions],
  )

  const getTodayRuleApplications = useCallback(
    (childId: string, ruleId: string) => {
      const today = new Date().toISOString().split("T")[0]
      return (state.ruleApplications ?? []).filter(
        (ra) => ra.ruleId === ruleId && ra.childId === childId && ra.appliedAt.split("T")[0] === today,
      ).length
    },
    [state.ruleApplications],
  )

  return (
    <FamilyContext.Provider
      value={{
        state: stateWithOrderedChildren,
        dispatch,
        isLoaded,
        selectedChild,
        todayCompletions,
        getTodayCompletionsForChild,
        isTaskCompletedToday,
        getTodayRuleApplications,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

// Hook to use context
export function useFamily() {
  const context = useContext(FamilyContext)
  if (context === undefined) {
    throw new Error("useFamily must be used within a FamilyProvider")
  }
  return context
}

export const useFamilyContext = useFamily

// Helper to check if task limit is reached
export function getTaskCompletionCountToday(
  taskId: string,
  childId: string,
  taskCompletions: { taskId: string; childId: string; completedAt: string }[],
): number {
  const today = new Date().toISOString().split("T")[0]
  return taskCompletions.filter(
    (tc) => tc.taskId === taskId && tc.childId === childId && new Date(tc.completedAt).toDateString() === today,
  ).length
}

// Helper to check if rule limit is reached
export function getRuleApplicationsCountToday(
  childId: string,
  ruleId: string,
  ruleApplications: { ruleId: string; childId: string; appliedAt: string }[],
): number {
  const today = new Date().toISOString().split("T")[0]
  return ruleApplications.filter(
    (ra) => ra.ruleId === ruleId && ra.childId === childId && new Date(ra.appliedAt).toDateString() === today,
  ).length
}
