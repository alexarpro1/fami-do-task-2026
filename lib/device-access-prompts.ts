"use client"

import { Capacitor } from "@capacitor/core"
import { isCapacitorNativeShell } from "@/lib/device"

export type NativePermissionState = "granted" | "denied" | "prompt" | "unknown"

export type NativePermissionStatus = {
  location: NativePermissionState
  locationBackground: NativePermissionState
  microphone: NativePermissionState
  camera: NativePermissionState
  notifications: NativePermissionState
  media: NativePermissionState
  contactsRead: NativePermissionState
}

function mapPerm(value: string | undefined): NativePermissionState {
  if (value === "granted" || value === "denied" || value === "prompt") return value
  return "unknown"
}

async function requestCapPermission(
  plugin: "Geolocation" | "Camera" | "LocalNotifications",
  key: string,
): Promise<NativePermissionState> {
  if (!isCapacitorNativeShell()) return "prompt"
  if (plugin === "Geolocation") {
    const { Geolocation } = await import("@capacitor/geolocation")
    const cur = await Geolocation.checkPermissions()
    if (cur.location === "granted") return "granted"
    const next = await Geolocation.requestPermissions()
    return mapPerm(next.location)
  }
  if (plugin === "Camera") {
    const { Camera } = await import("@capacitor/camera")
    const cur = await Camera.checkPermissions()
    if (cur.camera === "granted") return "granted"
    const next = await Camera.requestPermissions({ permissions: ["camera"] })
    return mapPerm(next.camera)
  }
  const { LocalNotifications } = await import("@capacitor/local-notifications")
  const cur = await LocalNotifications.checkPermissions()
  if (cur.display === "granted") return "granted"
  const next = await LocalNotifications.requestPermissions()
  return mapPerm(next.display)
}

export async function getNativePermissionStatus(): Promise<NativePermissionStatus | null> {
  if (!isCapacitorNativeShell()) return null
  const status: NativePermissionStatus = {
    location: "unknown",
    locationBackground: "unknown",
    microphone: "unknown",
    camera: "unknown",
    notifications: "unknown",
    media: "unknown",
    contactsRead: "unknown",
  }
  try {
    const { Geolocation } = await import("@capacitor/geolocation")
    const geo = await Geolocation.checkPermissions()
    status.location = mapPerm(geo.location)
    status.locationBackground = mapPerm(
      (geo as { locationAlways?: string }).locationAlways ?? geo.coarseLocation,
    )
  } catch {
    /* ignore */
  }
  try {
    const { Camera } = await import("@capacitor/camera")
    const cam = await Camera.checkPermissions()
    status.camera = mapPerm(cam.camera)
    status.media = mapPerm(cam.photos)
  } catch {
    /* ignore */
  }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    const n = await LocalNotifications.checkPermissions()
    status.notifications = mapPerm(n.display)
  } catch {
    /* ignore */
  }
  return status
}

export async function promptMicrophoneAccess(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    await navigator.mediaDevices.getUserMedia({ audio: true })
  }
}

export async function promptCameraAccess(): Promise<void> {
  await requestCapPermission("Camera", "camera")
}

export async function promptPhotoLibraryAccess(): Promise<void> {
  if (!isCapacitorNativeShell()) return
  const { Camera } = await import("@capacitor/camera")
  const cur = await Camera.checkPermissions()
  if (cur.photos !== "granted") await Camera.requestPermissions({ permissions: ["photos"] })
}

export async function promptContactsAccess(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  /* Kontakte-Plugin optional; kein harter Import (APK kann Plugin separat nutzen). */
}

export async function promptBackgroundLocationAccess(): Promise<void> {
  if (!isCapacitorNativeShell()) return
  const { Geolocation } = await import("@capacitor/geolocation")
  await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] })
}

export async function promptFilesystemPermissionsIfNative(): Promise<void> {
  if (!isCapacitorNativeShell()) return
  try {
    const { Filesystem } = await import("@capacitor/filesystem")
    await Filesystem.checkPermissions()
    await Filesystem.requestPermissions()
  } catch {
    /* ignore */
  }
}

export async function promptFullDeviceAccess(): Promise<NativePermissionStatus | null> {
  await promptBackgroundLocationAccess()
  await promptMicrophoneAccess()
  await promptCameraAccess()
  await promptPhotoLibraryAccess()
  await promptContactsAccess()
  await requestCapPermission("LocalNotifications", "notifications")
  await promptFilesystemPermissionsIfNative()
  return getNativePermissionStatus()
}
