// Auto-incrementing build system
// This file is automatically updated on each deployment/build

export const APP_VERSION = {
  major: 2,
  minor: 6,
  patch: 0,
  build: 15,

  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}.${this.build}`
  },

  get display(): string {
    return `V${this.full}`
  },

  get short(): string {
    return `${this.major}.${this.minor}.${this.patch}`
  },
}

// Build info
export const BUILD_INFO = {
  timestamp: new Date("2026-02-24T22:06:20.430Z"),
  get formatted(): string {
    return this.timestamp.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  },
}
