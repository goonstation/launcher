import { appCacheDir } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import {
  deserializeGameState,
  deserializeRoundDuration,
  deserializeShuttleDirection,
  deserializeShuttleLocation,
  deserializeShuttleOnline,
  deserializeShuttleTimer,
} from "./serverDataUtils.ts";
import packageInfo from "../../package.json" with { type: "json" };
import { getSettings } from "./settingsService.ts";

interface ApiResponse {
  data: ServerInfo[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface ServerInfo {
  id: number;
  server_id: string;
  name: string;
  short_name: string;
  address: string;
  port: number;
  active: boolean;
  invisible: boolean;
  group_id: ServerGroup;
  created_at: string;
  updated_at: string;
  player_count: number;
  current_round_id: number;
  current_map: string;
  gamestate?: ServerGameState;
  round_duration?: number;
  shuttle_direction?: ShuttleDirection;
  shuttle_location?: ShuttleLocation;
  shuttle_online?: boolean | number;
  shuttle_timer?: number;
}

export enum ServerGroup {
  DEFAULT = 1,
  TOMATO = 2,
}

export enum ShuttleDirection {
  TO_STATION = 1,
  TO_CENTCOMM = -1,
}

export enum ShuttleLocation {
  CENTCOM = 0,
  STATION = 1,
  TRANSIT = 1.5,
  RETURNED = 2,
}

export enum ServerDataState {
  LOADING = "loading",
  LOADED_FRESH = "loaded_fresh",
  LOADED_CACHE = "loaded_cache",
  REFRESHING = "refreshing",
  ERROR = "error",
}

export enum ServerGameState {
  INVALID = 0,
  PRE_MAP_LOAD = 1,
  MAP_LOAD = 2,
  WORLD_INIT = 3,
  WORLD_NEW = 4,
  PREGAME = 5,
  SETTING_UP = 6,
  PLAYING = 7,
  FINISHED = 8,
}

let currentState = ServerDataState.LOADING;
let refreshInterval: number | null = null;
const REFRESH_INTERVAL_MS = 45_000; // 45 seconds

/**
 * Get current server data state
 */
export function getServerDataState(): ServerDataState {
  return currentState;
}

/**
 * Start the background refresh for server status
 */
export function startServerStatusRefresh() {
  // Clear any existing interval
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
  }

  // Initial fetch
  fetchServerStatus().catch(console.error);

  // Set up regular background refresh
  refreshInterval = setInterval(() => {
    // Don't auto-refresh if we're already in loading/refreshing state
    const currentState = getServerDataState();
    if (
      currentState !== ServerDataState.LOADING &&
      currentState !== ServerDataState.REFRESHING
    ) {
      fetchServerStatus().catch(console.error);
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * Stop the background refresh for server status
 */
export function stopServerStatusRefresh() {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/**
 * Dispatch a server status event with data
 */
function dispatchServerEvent(
  state: ServerDataState,
  servers: ServerInfo[] = [],
  error: Error | null = null,
) {
  currentState = state;

  // Dispatch event to notify the UI
  document.dispatchEvent(
    new CustomEvent("server-status-update", {
      detail: {
        state,
        servers,
        error: error?.message || null,
      },
    }),
  );
}

/**
 * Save server data to cache
 */
async function cacheServerData(servers: ServerInfo[]): Promise<void> {
  try {
    const cacheDir = await appCacheDir();
    const cacheFilePath = `${cacheDir}/servers.json`;

    // Make sure the directory exists
    const dirExists = await exists(cacheDir);
    if (!dirExists) {
      await mkdir(cacheDir, { recursive: true });
    }

    // Save the server data
    await writeTextFile(cacheFilePath, JSON.stringify(servers));
    console.debug("Server data cached successfully");
  } catch (error) {
    console.error("Error caching server data:", error);
  }
}

/**
 * Load server data from cache
 */
async function loadCachedServerData(): Promise<ServerInfo[] | null> {
  try {
    const cacheDir = await appCacheDir();
    const cacheFilePath = `${cacheDir}/servers.json`;

    // Check if cache file exists
    const fileExists = await exists(cacheFilePath);
    if (!fileExists) {
      console.log("No cached server data found");
      return null;
    }

    // Read and parse the cached data
    const cachedData = await readTextFile(cacheFilePath);
    const servers = JSON.parse(cachedData) as ServerInfo[];
    console.debug("Loaded cached server data");
    return servers;
  } catch (error) {
    console.error("Error loading cached server data:", error);
    return null;
  }
}

export async function fetchServerStatus(): Promise<ServerInfo[]> {
  dispatchServerEvent(ServerDataState.LOADING);

  // Try to load cached data first
  let cachedData: ServerInfo[] | null = null;
  try {
    cachedData = await loadCachedServerData();

    if (cachedData) {
      dispatchServerEvent(ServerDataState.LOADED_CACHE, cachedData);

      dispatchServerEvent(ServerDataState.REFRESHING, cachedData);

      // Start fetch in background
      fetchFreshData().catch((error) => {
        console.error("Background fetch failed:", error);
        // We stay in LOADED_CACHE state if refresh fails
        dispatchServerEvent(
          ServerDataState.LOADED_CACHE,
          cachedData || [],
          error,
        );
      });

      return cachedData;
    }
  } catch (cachedError) {
    console.error("Error loading cached data:", cachedError);
  }

  // If no cached data or error loading cache, fetch directly and wait
  try {
    return await fetchFreshData();
  } catch (error) {
    if (error instanceof Error) {
      // If we have cached data from earlier, use that with an error state
      if (cachedData) {
        dispatchServerEvent(ServerDataState.LOADED_CACHE, cachedData, error);
        return cachedData;
      }

      // Otherwise report the error with empty data
      dispatchServerEvent(ServerDataState.ERROR, [], error);
    } else {
      dispatchServerEvent(
        ServerDataState.ERROR,
        [],
        new Error("Unknown error fetching server data"),
      );
    }

    // Return empty array on failure with no cache
    return [];
  }
}

/**
 * Fetch fresh data from the server
 */
async function fetchFreshData(): Promise<ServerInfo[]> {
  try {
    // Use Tauri's HTTP plugin to fetch data
    const request = new Request("https://api.goonhub.com/servers", {
      headers: { "User-Agent": `GoonstationLauncher/${packageInfo.version}` },
    });
    const response = await fetch(request, { connectTimeout: 5_000 });

    // Check if response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const apiResponse: ApiResponse = await response.json();
    const servers = apiResponse.data;

    // Process server data: normalize deserialized fields and provide safe defaults
    const processedServers = servers.map((server) => {
      const raw = server as unknown as Record<string, unknown>;

      const gamestate = deserializeGameState(raw.gamestate);
      const round_duration = deserializeRoundDuration(raw.round_duration);
      const shuttle_timer = deserializeShuttleTimer(raw.shuttle_timer);
      const shuttle_online = deserializeShuttleOnline(raw.shuttle_online);
      const shuttle_direction = deserializeShuttleDirection(
        raw.shuttle_direction,
      );
      const shuttle_location = deserializeShuttleLocation(raw.shuttle_location);

      return {
        ...server,
        gamestate,
        round_duration,
        shuttle_timer,
        shuttle_online,
        shuttle_direction,
        shuttle_location,
      } as ServerInfo;
    });

    // Cache the successful response
    await cacheServerData(processedServers);

    // Dispatch fresh data event
    dispatchServerEvent(ServerDataState.LOADED_FRESH, processedServers);

    return processedServers;
  } catch (error) {
    console.error("Error fetching server status:", error);

    // Propagate the error upward
    throw error;
  }
}

/**
 * Check if a server is online
 */
export function isServerOnline(server: ServerInfo): boolean {
  return server.active === true;
}

/**
 * Sort servers by visibility and ID
 */
export async function getSortedServers(
  servers: ServerInfo[],
): Promise<ServerInfo[]> {
  const settings = await getSettings();
  let filteredServers = servers;
  if (!settings.showInvisibleServers) {
    filteredServers = servers.filter((s) =>
      s.invisible !== true ||
      // Always include tomato servers, as long as they're active
      (s.group_id === ServerGroup.TOMATO && s.active === true)
    );
  }
  // Remove inactive servers
  const activeServers = filteredServers.filter((s) => s.active === true);
  // Sort by ID
  return activeServers.sort((a, b) => a.id - b.id);
}
