import { fetch } from "@tauri-apps/plugin-http";
import { appCacheDir } from "@tauri-apps/api/path";
import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";

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
  created_at: string | null;
  updated_at: string;
  orchestrator?: string;
  byond_link?: string;
}

// Track if we're using cached data
let isUsingCachedData = false;

/**
 * Get whether we're using cached data
 */
export function getIsUsingCachedData(): boolean {
  return isUsingCachedData;
}

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
  try {
    // Use Tauri's HTTP plugin to fetch data
    const response = await fetch("https://api.goonhub.com/servers", {
      method: "GET",
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

    // Reset the cached data flag
    isUsingCachedData = false;

    return processedServers;
  } catch (error) {
    console.error("Error fetching server status:", error);

    // Try to load cached data
    const cachedData = await loadCachedServerData();

    if (cachedData) {
      // Set flag to indicate we're using cached data
      isUsingCachedData = true;
      return cachedData;
    }

    // If no cached data available, return empty array
    isUsingCachedData = true;
    console.error("No cached data available and network request failed");
    return [];
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
  const invisibleServers = servers.filter((s) => s.invisible === true);

  // Sort both arrays by ID
  const sortedVisibleServers = visibleServers.sort((a, b) => a.id - b.id);
  const sortedInvisibleServers = invisibleServers.sort((a, b) => a.id - b.id);

  // Combine both arrays, with visible servers first
  return [...sortedVisibleServers, ...sortedInvisibleServers];
}

/**
 * Count online servers
 */
export function getOnlineServerCount(servers: ServerInfo[]): number {
  return servers.filter((server) => isServerOnline(server)).length;
}
