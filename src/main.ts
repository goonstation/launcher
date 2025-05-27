import { getCurrentWindow } from "@tauri-apps/api/window";
import { initAudioService } from "./services/audioService.ts";
import {
  fetchServerStatus,
  startServerStatusRefresh,
} from "./services/serverService.ts";
import { getSettings } from "./services/settingsService.ts";
import { initSettingsUIService } from "./services/settingsUIService.ts";
import {
  createServerButtons,
  initUIService,
  updateStatusNotice,
} from "./services/uiService.ts";
import { initUpdateUIService } from "./services/updateUIService.ts";
import { startupUpdateCheck } from "./services/updateService.ts";

function initApp() {
  const backgroundMusic = document.querySelector<HTMLAudioElement>(
    "#background-music",
  )!;
  const muteButton = document.querySelector<HTMLButtonElement>("#mute-button")!;
  const serverButtonsContainer = document.querySelector<HTMLElement>(
    "#server-buttons-container",
  )!;
  const refreshButton = document.querySelector<HTMLButtonElement>(
    "#refresh-button",
  )!;
  const exitButton = document.querySelector<HTMLButtonElement>("#exit-button")!;
  const noticeLabel = document.querySelector<HTMLElement>("#notice-label")!;
  const settingsButton = document.querySelector<HTMLButtonElement>(
    "#settings-button",
  )!;

  getCurrentWindow().show();

  // Initialize services
  initAudioService(backgroundMusic, muteButton);
  initUIService(serverButtonsContainer, refreshButton, noticeLabel);
  initSettingsUIService(settingsButton);
  initUpdateUIService();

  // Initialize settings
  getSettings().catch((error) => {
    console.error("Error initializing settings:", error);
  });

  // Initialize auto update check
  startupUpdateCheck();

  // Set up button event listeners for refresh and exit
  refreshButton.addEventListener("click", updateServerStatus);

  exitButton.addEventListener("click", async () => {
    noticeLabel.textContent = "Exiting application...";
    await getCurrentWindow().close();
  });

  // Listen for server status updates
  document.addEventListener(
    "server-status-update",
    ((event: CustomEvent) => {
      const { state, servers, error } = event.detail;

      // Update UI based on the server state
      updateStatusNotice(state, error);

      // Only update the server buttons if we have data
      if (servers?.length > 0) {
        createServerButtons(servers);
      }
    }) as EventListener,
  );

  // Start server status refresh
  startServerStatusRefresh();
}

/** Update server status information manually */
async function updateServerStatus() {
  try {
    await fetchServerStatus();
  } catch (error) {
    console.error("Error in updateServerStatus:", error);
  }
}

// Initialize the app when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp();

  // Prevent right-click context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());
});
