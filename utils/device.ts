/**
 * Device and Native App Utilities
 * Re-export from lib/device for consistent import paths.
 * Use: import { getDeviceId, getDeviceName, ... } from "@/utils/device"
 */
export {
  getDeviceId,
  getDeviceName,
  setDeviceName,
  isNativeApp,
  openQRScanner,
  getPlatform,
  getHardwareDeviceId,
} from "@/lib/device"
