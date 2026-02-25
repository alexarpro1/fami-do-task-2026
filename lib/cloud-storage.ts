"use client"

export type CloudProvider = "google-drive" | "dropbox" | "onedrive"

export interface CloudAccount {
  id: string
  provider: CloudProvider
  email: string
  displayName: string
  connectedAt: Date
  folderPath: string
}

export interface CloudStorage {
  currentAccount: CloudAccount | null
  accounts: CloudAccount[]
}

const STORAGE_KEY = "famiapp_cloud_accounts"

export function getCloudAccounts(): CloudStorage {
  if (typeof window === "undefined") {
    return { currentAccount: null, accounts: [] }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { currentAccount: null, accounts: [] }
  }

  try {
    const data = JSON.parse(stored)
    return {
      currentAccount: data.currentAccount
        ? { ...data.currentAccount, connectedAt: new Date(data.currentAccount.connectedAt) }
        : null,
      accounts: data.accounts.map((acc: any) => ({
        ...acc,
        connectedAt: new Date(acc.connectedAt),
      })),
    }
  } catch {
    return { currentAccount: null, accounts: [] }
  }
}

export function saveCloudAccounts(storage: CloudStorage): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

export function addCloudAccount(
  provider: CloudProvider,
  email: string,
  displayName: string,
  folderPath: string,
): CloudAccount {
  const storage = getCloudAccounts()

  const newAccount: CloudAccount = {
    id: `${provider}-${Date.now()}`,
    provider,
    email,
    displayName,
    connectedAt: new Date(),
    folderPath,
  }

  storage.accounts.push(newAccount)

  // Set as current if it's the first account
  if (!storage.currentAccount) {
    storage.currentAccount = newAccount
  }

  saveCloudAccounts(storage)
  return newAccount
}

export function setCurrentAccount(accountId: string): boolean {
  const storage = getCloudAccounts()
  const account = storage.accounts.find((acc) => acc.id === accountId)

  if (!account) return false

  storage.currentAccount = account
  saveCloudAccounts(storage)
  return true
}

export function removeCloudAccount(accountId: string): boolean {
  const storage = getCloudAccounts()
  const index = storage.accounts.findIndex((acc) => acc.id === accountId)

  if (index === -1) return false

  storage.accounts.splice(index, 1)

  // If removed account was current, set first available or null
  if (storage.currentAccount?.id === accountId) {
    storage.currentAccount = storage.accounts.length > 0 ? storage.accounts[0] : null
  }

  saveCloudAccounts(storage)
  return true
}

export function getProviderName(provider: CloudProvider): string {
  switch (provider) {
    case "google-drive":
      return "Google Drive"
    case "dropbox":
      return "Dropbox"
    case "onedrive":
      return "OneDrive"
    default:
      return "Unbekannt"
  }
}

export function getProviderIcon(provider: CloudProvider): string {
  switch (provider) {
    case "google-drive":
      return "🔵" // Google colors
    case "dropbox":
      return "🔷" // Dropbox blue
    case "onedrive":
      return "☁️" // OneDrive cloud
    default:
      return "📁"
  }
}
