import { getCurrentWindow } from '@tauri-apps/api/window';
import { fetch } from '@tauri-apps/plugin-http';

/**
 * Interface for server info from the API
 */
interface ServerInfo {
  id: number;
  server_id: string;
  name: string;
  short_name: string;
  address: string;
  port: number;
  active: boolean | string;
  invisible: boolean | string;
  created_at: string | null;
  updated_at: string;
  orchestrator?: string;
  byond_link?: string;
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

// DOM Elements
let backgroundMusic: HTMLAudioElement | null;
let muteButton: HTMLButtonElement | null;
let serverButtonsContainer: HTMLElement | null;
let refreshButton: HTMLButtonElement | null;
let exitButton: HTMLButtonElement | null;
let noticeLabel: HTMLElement | null;

// Audio state
let isMuted = false;

/**
 * Initialize audio functionality
 */
function initAudio() {
  if (!backgroundMusic || !muteButton) return;
  
  // Set initial volume
  backgroundMusic.volume = 0.5;
  
  // Start playing the background music
  backgroundMusic.play().catch(error => {
    console.error("Audio playback failed:", error);
    noticeLabel!.textContent = "Audio autoplay blocked by browser. Click the sound icon to play.";
  });
  
  // Set up mute button click handler
  muteButton.addEventListener("click", toggleAudio);
}

/**
 * Toggle audio mute/unmute
 */
function toggleAudio() {
  if (!backgroundMusic || !muteButton || !noticeLabel) return;
  
  isMuted = !isMuted;
  
  if (isMuted) {
    // Mute audio
    backgroundMusic.pause();
    muteButton.textContent = "🔇";
    noticeLabel.textContent = "Audio muted";
  } else {
    // Unmute audio
    backgroundMusic.play().catch(console.error);
    muteButton.textContent = "🔊";
    noticeLabel.textContent = "Audio unmuted - Playing";
  }
}

/**
 * Initialize the application
 */
function initApp() {
  // Get references to DOM elements
  backgroundMusic = document.querySelector("#background-music");
  muteButton = document.querySelector("#mute-button");
  serverButtonsContainer = document.querySelector("#server-buttons-container");
  refreshButton = document.querySelector("#refresh-button");
  exitButton = document.querySelector("#exit-button");
  noticeLabel = document.querySelector("#notice-label");
  
  // Initialize audio
  initAudio();
  
  // Set up button event listeners
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      fetchServerStatus();
    });
  }
    if (exitButton) {
    exitButton.addEventListener("click", async () => {
      if (noticeLabel) noticeLabel.textContent = "Exiting application...";
      
      await getCurrentWindow().close();
    });
  }
  
  // Fetch server status initially
  fetchServerStatus();
}

/**
 * Fetch server status information
 */
async function fetchServerStatus() {
  if (!noticeLabel || !refreshButton) return;
  
  // Update UI to show loading state
  noticeLabel.textContent = "Fetching server status...";
  refreshButton.disabled = true;
  
  try {    // Use Tauri's HTTP plugin to fetch data
    const response = await fetch('https://api.goonhub.com/servers', {
      method: 'GET'
    });
    
    // Check if response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const apiResponse: ApiResponse = await response.json();
    const servers = apiResponse.data;
    
    // Process server data
    const processedServers = servers.map(server => {
      // Generate byond_link if it doesn't exist
      if (!server.byond_link) {
        server.byond_link = `byond://${server.address}:${server.port}`;
      }
      return server;
    });
    
    updateServerDisplay(processedServers);
    createServerButtons(processedServers);
    
    // Enable refresh button and update notice
    if (refreshButton) refreshButton.disabled = false;
    if (noticeLabel) {
      const onlineCount = processedServers.filter(s => s.active === true || s.active === "yes").length;
      noticeLabel.textContent = `Server status updated: ${onlineCount} servers online`;
    }
  } catch (error) {
    console.error("Error fetching server status:", error);
      // Use mock data as fallback if there's an error
    const mockServers = getMockServerData();
    updateServerDisplay(mockServers);
    createServerButtons(mockServers);
    
    // Update UI with error message
    if (noticeLabel) noticeLabel.textContent = `Error fetching data. Using cached data.`;
    if (refreshButton) refreshButton.disabled = false;
  }
}

/**
 * Update the server status display (now just processes server data)
 */
function updateServerDisplay(servers: ServerInfo[]) {
  // This function previously updated the text display
  // Now it's just a pass-through since we don't need the status text box
  // We could remove it, but keeping it for now as it might be useful for logging
  
  console.log("Server status updated:", servers.length, "servers found");
  
  // We may want to update the notice label with server count
  if (noticeLabel) {
    const onlineCount = servers.filter(s => s.active === true || s.active === "yes").length;
    noticeLabel.textContent = `${onlineCount} servers online`;
  }
}

/**
 * Create buttons for each server
 */
function createServerButtons(servers: ServerInfo[]) {
  if (!serverButtonsContainer) return;
  
  // Clear existing buttons
  serverButtonsContainer.innerHTML = "";
  
  // Sort servers: non-invisible first, then by ID
  const visibleServers = servers.filter(s => s.invisible !== true && s.invisible !== "yes");
  const invisibleServers = servers.filter(s => s.invisible === true || s.invisible === "yes");
  
  // Sort both arrays by ID
  const sortedVisibleServers = visibleServers.sort((a, b) => a.id - b.id);
  const sortedInvisibleServers = invisibleServers.sort((a, b) => a.id - b.id);
  
  // Combine both arrays, with visible servers first
  const sortedServers = [...sortedVisibleServers, ...sortedInvisibleServers];
  
  // Create buttons for each server
  sortedServers.forEach(server => {
    const button = document.createElement("button");
    button.textContent = `Join ${server.short_name}`;
    button.className = "server-button";
    
    // Add status indicator to the button
    const isOnline = server.active === true || server.active === "yes";
    button.classList.add(isOnline ? "server-online" : "server-offline");
    
    // Add server ID as data attribute for reference
    button.dataset.serverId = server.server_id;
    
    // Add click handler
    button.addEventListener("click", () => {
      // Only allow joining online servers
      if (isOnline) {
        alert(`Joining server ${server.name} at ${server.byond_link}`);
        // In real app, launch the game with this server
        // invoke("launch_game", { serverLink: server.byond_link });
      } else {
        alert(`Server ${server.name} is currently offline.`);
      }
    });
    
    serverButtonsContainer!.appendChild(button);
  });
}

/**
 * Get mock server data for fallback when API fails
 */
function getMockServerData(): ServerInfo[] {
  return [
    {
      id: 1,
      server_id: "main1",
      name: "Goonstation 1 Classic: Heisenbee",
      short_name: "Goon 1",
      address: "goon1.goonhub.com",
      port: 26100,
      active: "yes",
      invisible: "no",
      created_at: null,
      updated_at: "2025-01-30T15:23:38.000000Z",
      byond_link: "byond://goon1.goonhub.com:26100"
    },
    {
      id: 2,
      server_id: "main2",
      name: "Goonstation 2 Classic: Bombini",
      short_name: "Goon 2",
      address: "goon2.goonhub.com",
      port: 26200,
      active: "no",
      invisible: "no",
      created_at: null,
      updated_at: "2025-01-30T15:23:38.000000Z",
      byond_link: "byond://goon2.goonhub.com:26200"
    },
    {
      id: 3,
      server_id: "main3",
      name: "Goonstation 3 Roleplay: Morty",
      short_name: "Goon 3 RP",
      address: "goon3.goonhub.com",
      port: 26300,
      active: "yes",
      invisible: "no",
      created_at: null,
      updated_at: "2025-01-30T15:23:38.000000Z",
      byond_link: "byond://goon3.goonhub.com:26300"
    }
  ];
}

// Initialize the app when DOM content is loaded
window.addEventListener("DOMContentLoaded", initApp);
