// Minimal shared UI state so the sidebar Hi button and the fullscreen
// market overlay can talk to each other without needing extra host
// services. Components subscribe with React's useSyncExternalStore.

const listeners = new Set()

export const uiState = { marketOpen: false }

export function setMarketOpen(open) {
  if (uiState.marketOpen === open) return
  uiState.marketOpen = open
  for (const listener of listeners) listener()
}

export function subscribeUi(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
