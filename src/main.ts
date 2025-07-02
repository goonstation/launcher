import { getCurrentWindow } from "@tauri-apps/api/window";
import { initAudioService } from "./services/audioService.ts";
import {
  fetchServerStatus,
  ServerDataState,
  startServerStatusRefresh,
} from "./services/serverService.ts";
import { initSettingsUIService } from "./services/settingsUIService.ts";
import {
  createServerButtons,
  initUIService,
  updateStatusNotice,
} from "./services/uiService.ts";
import { initUpdateUIService } from "./services/updateUIService.ts";
import { startupUpdateCheck } from "./services/updateService.ts";
import { stopDreamSeekerMonitor } from "./services/serverJoinService.ts";
import {
  checkAndShowByondStatus,
  initByondUIService,
} from "./services/byondUIService.ts";
import { checkByondVersionAndReset } from "./services/byondService.ts";
import { initExternalLinkService } from "./services/externalLinkService.ts";

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
  initByondUIService();
  initExternalLinkService();

  // Initialize auto update check
  startupUpdateCheck();

  // Check BYOND version and show notification if needed
  checkAndShowByondStatus();

  // Check if BYOND version in Github has changed and reset any override
  checkByondVersionAndReset();

  // Setup periodic check for BYOND version changes (every 30 minutes)
  setInterval(() => {
    checkByondVersionAndReset();
  }, 30 * 60 * 1000); // 30 minutes

  // Set up button event listeners for refresh and exit
  refreshButton.addEventListener("click", updateServerStatus);

  exitButton.addEventListener("click", async () => {
    noticeLabel.textContent = "Exiting application...";
    await getCurrentWindow().close();
  });

  document.addEventListener(
    "server-status-update",
    ((event: CustomEvent) => {
      const { state, servers, error } = event.detail;
      updateStatusNotice(state, error);
      if (servers?.length > 0 && state !== ServerDataState.REFRESHING) {
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

// Cleanup when the application is closed
globalThis.addEventListener("beforeunload", () => {
  stopDreamSeekerMonitor();
});
