import { getCurrentWindow } from "@tauri-apps/api/window";
import { initAudioService } from "./services/audioService";
import {
  fetchServerStatus,
  startServerStatusRefresh,
} from "./services/serverService";
import { getSettings } from "./services/settingsService";
import { initSettingsUIService } from "./services/settingsUIService";
import {
  createServerButtons,
  initUIService,
  updateStatusNotice,
} from "./services/uiService";

/**
 * Initialize the application
 */
function initApp() {
  // Get references to DOM elements
  const backgroundMusic =
    document.querySelector<HTMLAudioElement>("#background-music")!;
  const muteButton = document.querySelector<HTMLButtonElement>("#mute-button")!;
  const serverButtonsContainer = document.querySelector<HTMLElement>(
    "#server-buttons-container",
  )!;
  const refreshButton =
    document.querySelector<HTMLButtonElement>("#refresh-button")!;
  const exitButton = document.querySelector<HTMLButtonElement>("#exit-button")!;
  const noticeLabel = document.querySelector<HTMLElement>("#notice-label")!;
  const settingsButton =
    document.querySelector<HTMLButtonElement>("#settings-button")!;

  // Initialize services
  initAudioService(backgroundMusic, muteButton, noticeLabel);
  initUIService(serverButtonsContainer, refreshButton, noticeLabel);
  initSettingsUIService(settingsButton, noticeLabel);

  // Initialize settings
  getSettings().catch((error) => {
    console.error("Error initializing settings:", error);
  });

  // Set up button event listeners for refresh and exit
  refreshButton.addEventListener("click", updateServerStatus);

  exitButton.addEventListener("click", async () => {
    noticeLabel.textContent = "Exiting application...";
    await getCurrentWindow().close();
  });

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

  // Start server status refresh
  startServerStatusRefresh();
}

/**
 * Update server status information manually
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

// Initialize the app when DOM content is loaded
window.addEventListener("DOMContentLoaded", initApp);
