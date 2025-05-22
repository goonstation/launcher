import { getCurrentWindow } from '@tauri-apps/api/window';

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
  active: string;
  invisible: string;
  created_at: string;
  updated_at: string;
  orchestrator: string;
  byond_link: string;
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
function fetchServerStatus() {
  if (!noticeLabel || !refreshButton) return;
  
  // Update UI to show loading state
  noticeLabel.textContent = "Fetching server status...";
  refreshButton.disabled = true;
  
  // For now, simulate getting server data with a mock
  setTimeout(() => {
    const mockServers = [
      {
        id: 1,
        server_id: "main1",
        name: "Goonstation 1 (RP)",
        short_name: "RP #1",
        address: "goonhub.com",
        port: 26100,
        active: "yes",
        invisible: "no",
        created_at: "2023-07-01T00:00:00Z",
        updated_at: "2023-07-01T00:00:00Z",
        orchestrator: "main",
        byond_link: "byond://goonhub.com:26100"
      },
      {
        id: 2,
        server_id: "main2",
        name: "Goonstation 2 (Classic)",
        short_name: "Classic",
        address: "goonhub.com",
        port: 26200,
        active: "yes",
        invisible: "no",
        created_at: "2023-07-01T00:00:00Z",
        updated_at: "2023-07-01T00:00:00Z",
        orchestrator: "main",
        byond_link: "byond://goonhub.com:26200"
      },
      {
        id: 3,
        server_id: "dev",
        name: "Goonstation Dev",
        short_name: "Dev",
        address: "goonhub.com",
        port: 26400,
        active: "yes",
        invisible: "no",
        created_at: "2023-07-01T00:00:00Z",
        updated_at: "2023-07-01T00:00:00Z",
        orchestrator: "dev",
        byond_link: "byond://goonhub.com:26400"
      }
    ] as ServerInfo[];
    
    updateServerDisplay(mockServers);
    createServerButtons(mockServers);
    
    // Enable refresh button and update notice
    refreshButton!.disabled = false;
    noticeLabel!.textContent = "Server status updated successfully!";
  }, 1000);
  
  // In a real app, we'd use fetch API:
  // fetch('https://api.goonhub.com/servers')
  //   .then(response => response.json())
  //   .then(servers => { 
  //     updateServerDisplay(servers);
  //     createServerButtons(servers);
  //   })
  //   .catch(error => {
  //     noticeLabel.textContent = `Error: ${error.message}`;
  //     statusDisplay.textContent = "Failed to fetch server status. Please try again.";
  //   })
  //   .finally(() => {
  //     refreshButton.disabled = false;
  //   });
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
    const onlineCount = servers.filter(s => s.active === "yes").length;
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
  
  // Create buttons for each server
  servers.forEach(server => {
    const button = document.createElement("button");
    button.textContent = `Join ${server.short_name}`;
    button.className = "server-button";
    
    // Add click handler
    button.addEventListener("click", () => {
      alert(`Joining server ${server.name} at ${server.byond_link}`);
      // In real app, launch the game with this server
      // invoke("launch_game", { serverLink: server.byond_link });
    });
    
    serverButtonsContainer!.appendChild(button);
  });
}

// Initialize the app when DOM content is loaded
window.addEventListener("DOMContentLoaded", initApp);
