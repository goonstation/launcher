// Update UI service for managing update notification interface

import {
  downloadAndInstallUpdate,
  UPDATE_STATUS_EVENT,
  UpdateProgress,
  UpdateState,
} from "./updateService.ts";

// DOM Elements
let updateNotification: HTMLElement;
let updateText: HTMLElement;
let updateNowButton: HTMLButtonElement;
let updateLaterButton: HTMLButtonElement;

/** Initialize the update UI service */
export function initUpdateUIService() {
  updateNotification = document.getElementById(
    "update-notification",
  ) as HTMLElement;
  updateText = document.getElementById("update-text") as HTMLElement;
  updateNowButton = document.getElementById(
    "update-now-button",
  ) as HTMLButtonElement;
  updateLaterButton = document.getElementById(
    "update-later-button",
  ) as HTMLButtonElement;

  // Set up event listeners for update buttons
  updateNowButton.addEventListener("click", () => {
    updateText.textContent = "Downloading update...";

    // Create and add progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className = "update-progress";

    const progressBar = document.createElement("div");
    progressBar.className = "update-progress-bar";
    progressBar.style.width = "0%";

    progressContainer.appendChild(progressBar);

    // Remove buttons and add progress bar
    const buttonsContainer = document.querySelector(".update-buttons");
    if (buttonsContainer) {
      buttonsContainer.remove();
    }

    updateNotification.querySelector(".update-content")?.appendChild(
      progressContainer,
    );

    downloadAndInstallUpdate();
  });

  updateLaterButton.addEventListener("click", () => {
    hideUpdateNotification();
  });

  // Listen for update status events
  document.addEventListener(
    UPDATE_STATUS_EVENT,
    ((event: CustomEvent<UpdateProgress>) => {
      handleUpdateStatusChange(event.detail);
    }) as EventListener,
  );
}

/** Handle update status changes */
function handleUpdateStatusChange(progress: UpdateProgress): void {
  switch (progress.state) {
    case UpdateState.AVAILABLE:
      showUpdateNotification(progress.version || "imcoder");
      break;

    case UpdateState.DOWNLOADING:
      updateDownloadProgress(progress);
      break;

    case UpdateState.READY:
      updateText.textContent = "Update ready! Restarting...";
      break;

    case UpdateState.ERROR:
      showUpdateError(progress.error);
      break;
  }
}

function showUpdateNotification(version: string): void {
  updateText.textContent = `Launcher Update Available: v${version}`;
  updateNotification.classList.remove("hidden");
}

function hideUpdateNotification(): void {
  updateNotification.classList.add("hidden");
}

/** Update the download progress UI */
function updateDownloadProgress(progress: UpdateProgress): void {
  if (progress.percent !== undefined) {
    const progressBar = updateNotification.querySelector(
      ".update-progress-bar",
    );
    if (progressBar) {
      progressBar.setAttribute("style", `width: ${progress.percent}%`);
    }

    // Update the text if we have downloaded/total info
    if (progress.downloaded !== undefined && progress.total !== undefined) {
      const downloadedMB = (progress.downloaded / 1024 / 1024).toFixed(1);
      const totalMB = (progress.total / 1024 / 1024).toFixed(1);
      updateText.textContent =
        `Downloading: ${downloadedMB}/${totalMB} MB (${progress.percent}%)`;
    }
  }
}

/** Show update error message */
function showUpdateError(errorMessage?: string): void {
  if (errorMessage) {
    updateText.textContent = `Update Error: ${errorMessage}`;
  } else {
    updateText.textContent = "Update Error!";
  }

  // Replace with a close button
  const buttonsContainer = document.querySelector(".update-buttons");
  if (buttonsContainer) {
    buttonsContainer.innerHTML =
      '<button id="update-close-button" class="update-button">Close</button>';

    const closeButton = document.getElementById("update-close-button");
    if (closeButton) {
      closeButton.addEventListener("click", hideUpdateNotification);
    }
  }
}
