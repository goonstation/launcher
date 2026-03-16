// Small helpers to safely deserialize server-provided fields

import {
  ServerGameState,
  ShuttleDirection,
  ShuttleLocation,
} from "./serverService.ts";

/** Normalize a gamestate value coming from the server */
/** Deserialize a gamestate value from raw JSON */
export function deserializeGameState(
  value: unknown,
): ServerGameState | undefined {
  return typeof value === "number" ? (value as ServerGameState) : undefined;
}

/** Deserialize round duration (seconds) with default 0 */
export function deserializeRoundDuration(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

/** Deserialize shuttle timer (seconds) or null when absent */
export function deserializeShuttleTimer(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/** Deserialize shuttle online indicator (boolean) */
export function deserializeShuttleOnline(value: unknown): boolean {
  return value === true || value === 1;
}

/** Deserialize shuttle direction value */
export function deserializeShuttleDirection(
  value: unknown,
): ShuttleDirection | undefined {
  return typeof value === "number" ? (value as ShuttleDirection) : undefined;
}

/** Deserialize shuttle location value */
export function deserializeShuttleLocation(
  value: unknown,
): ShuttleLocation | undefined {
  return typeof value === "number"
    ? (value as unknown as ShuttleLocation)
    : undefined;
}

/** Helper to determine if a state should show PREROUND (<= SETTING_UP) */
export function isPreRoundState(state: ServerGameState | undefined): boolean {
  return typeof state === "number" && state <= ServerGameState.SETTING_UP;
}
