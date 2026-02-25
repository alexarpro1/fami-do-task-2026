// Hybrid Connection Manager – öffentliche API

export { ConnectionManager } from "./connection-manager"
export {
  useConnectionStore,
  useConnectionState,
  useConnectionMode,
  useConnectionLastError,
  useConnectionActive,
  useConnectionLocal,
  useConnectionCloud,
} from "./connection-store"
export type { ConnectionStoreState, ConnectionStoreActions } from "./connection-store"
export { createMockTransport } from "./connection-mock-transport"
export type { MockTransportOptions } from "./connection-mock-transport"
