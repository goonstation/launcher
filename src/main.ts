import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ServerInfo,
  fetchServerStatus,
  isServerOnline,
  getSortedServers,
  getServerDataState,
  ServerDataState,
} from "./serverService";

// DOM Elements
let backgroundMusic: HTMLAudioElement | null;
let muteButton: HTMLButtonElement | null;
let serverButtonsContainer: HTMLElement | null;
let refreshButton: HTMLButtonElement | null;
let exitButton: HTMLButtonElement | null;
let noticeLabel: HTMLElement | null;
let settingsButton: HTMLButtonElement | null;

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
    muteButton.classList.add("muted");
    noticeLabel.textContent = "🔇 music muted :(";
  } else {
    // Unmute audio
    backgroundMusic.play().catch(console.error);
    muteButton.textContent = "🔊";
    muteButton.classList.remove("muted");
    noticeLabel.textContent = "🔊 music unmuted :)";
  }
}

/**
 * Update the status notice based on server data state
 */
function updateStatusNotice(
  state: ServerDataState,
  errorMessage: string | null = null
) {
  if (!noticeLabel || !refreshButton) return;

  // Enable the refresh button for all states except LOADING
  refreshButton.disabled = state === ServerDataState.LOADING;

  // Remove all state classes
  noticeLabel.classList.remove("warning", "error", "refreshing");

  // Set the message based on the state
  switch (state) {
    case ServerDataState.LOADING:
      noticeLabel.textContent = "⏳ Fetching server status...";
      break;

    case ServerDataState.LOADED_FRESH:
      noticeLabel.textContent = `✅ server status updated`;
      break;

    case ServerDataState.LOADED_CACHE:
      noticeLabel.textContent = `⚠️ using cached data - connection failed`;
      noticeLabel.classList.add("warning");
      if (errorMessage) {
        console.warn(`Connection issue: ${errorMessage}`);
      }
      break;

    case ServerDataState.REFRESHING:
      noticeLabel.textContent = `⏳ refreshing...`;
      noticeLabel.classList.add("refreshing");
      break;

    case ServerDataState.ERROR:
      noticeLabel.textContent =
        errorMessage || "❌ error updating servers - please try again";
      noticeLabel.classList.add("error");
      break;
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
  settingsButton = document.querySelector("#settings-button");

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

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      toggleSettingsModal(true);
    });
  }
  const closeModalButton = document.querySelector("#close-modal-button");
  if (closeModalButton) {
    closeModalButton.addEventListener("click", () => {
      toggleSettingsModal(false);
    });
  }

  // Listen for server status updates
  document.addEventListener("server-status-update", ((event: CustomEvent) => {
    const { state, servers, error } = event.detail;

    // Update UI based on the server state
    updateStatusNotice(state, error);

    // Only update the server buttons if we have data
    if (servers?.length > 0) {
      createServerButtons(servers);
    }
  }) as EventListener);

  //
  setInterval(() => {
    // Don't auto-refresh if we're already in loading/refreshing state
    const currentState = getServerDataState();
    if (
      currentState !== ServerDataState.LOADING &&
      currentState !== ServerDataState.REFRESHING
    ) {
      fetchServerStatus().catch(console.error);
    }
  }, 20_000);
  +(
    // Fetch server status initially
    updateServerStatus()
  );
}

/**
 * Update server status information
 */
async function updateServerStatus() {
  try {
    // This will trigger the server-status-update event
    await fetchServerStatus();
  } catch (error) {
    console.error("Error in updateServerStatus:", error);
    // The event system will handle displaying the error
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
    button.className = "server-button styled";

    // Add separate lines via spans
    const line1 = document.createElement("span");
    line1.style.display = "block";
    line1.textContent = server.short_name;

    const line2 = document.createElement("span");
    line2.style.display = "block";
    line2.textContent = "Cogmap2";

    const line3 = document.createElement("span");
    line3.style.display = "block";
    line3.textContent = `69 online`;

    button.appendChild(line1);
    button.appendChild(line2);
    button.appendChild(line3);

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

/**
 * Toggle the settings modal
 */
function toggleSettingsModal(show: boolean) {
  const modal = document.querySelector("#settings-modal");
  if (!modal) return;
  modal.classList.toggle("hidden", !show);
}

// Initialize the app when DOM content is loaded
window.addEventListener("DOMContentLoaded", initApp);
