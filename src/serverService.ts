import { fetch } from "@tauri-apps/plugin-http";
import { appCacheDir } from "@tauri-apps/api/path";
import packageInfo from "../package.json";
import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";

/**
 * Interface for the API response
 */
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

/**
 * Interface for server info from the API
 */
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
  byond_link?: string;
}

/**
 * Server data state enum
 */
export enum ServerDataState {
  LOADING = "loading",
  LOADED_FRESH = "loaded_fresh",
  LOADED_CACHE = "loaded_cache",
  REFRESHING = "refreshing",
  ERROR = "error",
}

// Current data state
let currentState = ServerDataState.LOADING;

/**
 * Get current server data state
 */
export function getServerDataState(): ServerDataState {
  return currentState;
}

/**
 * Dispatch a server status event with data
 */
function dispatchServerEvent(
  state: ServerDataState,
  servers: ServerInfo[] = [],
  error: Error | null = null
) {
  // Update internal state
  currentState = state;

  // Dispatch event to notify the UI
  document.dispatchEvent(
    new CustomEvent("server-status-update", {
      detail: {
        state,
        servers,
        error: error?.message || null,
      },
    })
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

/**
 * Fetch server status information
 */
export async function fetchServerStatus(): Promise<ServerInfo[]> {
  // Set loading state immediately
  dispatchServerEvent(ServerDataState.LOADING);

  // Try to load cached data first
  let cachedData: ServerInfo[] | null = null;
  try {
    cachedData = await loadCachedServerData();

    if (cachedData) {
      // Dispatch cached data event
      dispatchServerEvent(ServerDataState.LOADED_CACHE, cachedData);

      // Change to refreshing state
      dispatchServerEvent(ServerDataState.REFRESHING, cachedData);

      // Start fetch in background
      fetchFreshData().catch((error) => {
        console.error("Background fetch failed:", error);
        // We stay in LOADED_CACHE state if refresh fails
        dispatchServerEvent(
          ServerDataState.LOADED_CACHE,
          cachedData || [],
          error
        ); // Fix: use empty array if cachedData is null
      });

      // Return cached data immediately
      return cachedData;
    }
  } catch (cachedError) {
    console.error("Error loading cached data:", cachedError);
    // Continue to fetch fresh data
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
        new Error("Unknown error fetching server data")
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
        UserAgent: `GoonstationLauncher/${packageInfo.version}`,
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
      // Generate byond_link if it doesn't exist
      if (!server.byond_link) {
        server.byond_link = `byond://${server.address}:${server.port}`;
      }
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
  // Sort servers: non-invisible first, then by ID
  const visibleServers = servers.filter((s) => s.invisible !== true);

  // Sort both arrays by ID
  const sortedVisibleServers = visibleServers.sort((a, b) => a.id - b.id);

  // Combine both arrays, with visible servers first
  return sortedVisibleServers;
}
