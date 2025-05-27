import { appCacheDir } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import packageInfo from "../../package.json" with { type: "json" };

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
  created_at: string;
  updated_at: string;
  player_count?: number;
}

export enum ServerDataState {
  LOADING = "loading",
  LOADED_FRESH = "loaded_fresh",
  LOADED_CACHE = "loaded_cache",
  REFRESHING = "refreshing",
  ERROR = "error",
}

let currentState = ServerDataState.LOADING;
let refreshInterval: number | null = null;
const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

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
    console.log("Server data cached successfully");
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
    console.log("Loaded cached server data");
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
    const response = await fetch("https://api.goonhub.com/servers", {
      method: "GET",
      headers: {
        "User-Agent": `GoonstationLauncher/${packageInfo.version}`,
      },
      connectTimeout: 5_000, // 5 seconds
    });

    // Check if response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const apiResponse: ApiResponse = await response.json();
    const servers = apiResponse.data;

    // Process server data
    const processedServers = servers.map((server) => {
      return server;
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
export function getSortedServers(servers: ServerInfo[]): ServerInfo[] {
  // Remove invisible servers
  const visibleServers = servers.filter((s) => s.invisible !== true);
  // Remove inactive servers
  const activeServers = visibleServers.filter((s) => s.active === true);

  // Sort both arrays by ID
  const sortedVisibleServers = activeServers.sort((a, b) => a.id - b.id);

  // Combine both arrays, with visible servers first
  return sortedVisibleServers;
}
