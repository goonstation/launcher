import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ServerInfo,
  fetchServerStatus,
  isServerOnline,
  getSortedServers,
  getOnlineServerCount,
  getIsUsingCachedData,
} from "./serverService";

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
  backgroundMusic.play().catch((error) => {
    console.error("Audio playback failed:", error);
    noticeLabel!.textContent =
      "Audio autoplay blocked by browser. Click the sound icon to play.";
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
      updateServerStatus();
    });
  }
  if (exitButton) {
    exitButton.addEventListener("click", async () => {
      if (noticeLabel) noticeLabel.textContent = "Exiting application...";

      await getCurrentWindow().close();
    });
  }

  // Fetch server status initially
  updateServerStatus();
}

/**
 * Update server status information
 */
async function updateServerStatus() {
  if (!noticeLabel || !refreshButton) return;

  // Update UI to show loading state
  noticeLabel.textContent = "Fetching server status...";
  refreshButton.disabled = true;

  try {
    // Get server data
    const servers = await fetchServerStatus();

    // Update the UI with server data
    updateServerDisplay(servers);
    createServerButtons(servers);

    // Enable refresh button and update notice
    if (refreshButton) refreshButton.disabled = false;

    if (noticeLabel) {
      const onlineCount = getOnlineServerCount(servers);

      // Show special message if using cached data
      if (getIsUsingCachedData()) {
        noticeLabel.textContent = `⚠️ Using cached data (${onlineCount} servers online) - Connection failed`;
        noticeLabel.classList.add("warning");
      } else {
        noticeLabel.textContent = `Server status updated: ${onlineCount} servers online`;
        noticeLabel.classList.remove("warning");
      }
    }
  } catch (error) {
    console.error("Error updating server status:", error);

    // Update UI with error message
    if (noticeLabel)
      noticeLabel.textContent = `Error updating servers. Please try again.`;
    if (refreshButton) refreshButton.disabled = false;
  }
}

/**
 * Update the server status display
 */
function updateServerDisplay(servers: ServerInfo[]) {
  // This function previously updated the text display
  // Now it's just a pass-through since we don't need the status text box

  console.log("Server status updated:", servers.length, "servers found");

  // We may want to update the notice label with server count
  if (noticeLabel) {
    const onlineCount = getOnlineServerCount(servers);
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

  // Get sorted servers
  const sortedServers = getSortedServers(servers);

  // Create buttons for each server
  sortedServers.forEach((server) => {
    const button = document.createElement("button");
    button.textContent = `Join ${server.short_name}`;
    button.className = "server-button";

    // Add status indicator to the button
    const serverOnline = isServerOnline(server);
    button.classList.add(serverOnline ? "server-online" : "server-offline");

    // Add server ID as data attribute for reference
    button.dataset.serverId = server.server_id;

    // Add click handler
    button.addEventListener("click", () => {
      // Only allow joining online servers
      if (serverOnline) {
        alert(`Joining server ${server.name} at ${server.byond_link}`);
      } else {
        alert(`Server ${server.name} is currently offline.`);
      }
    });

    serverButtonsContainer!.appendChild(button);
  });
}

// Initialize the app when DOM content is loaded
window.addEventListener("DOMContentLoaded", initApp);
