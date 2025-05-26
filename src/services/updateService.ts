import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Update status event name */
export const UPDATE_STATUS_EVENT = "update-status";

/** Update states */
export enum UpdateState {
  CHECKING = "checking",
  AVAILABLE = "available",
  DOWNLOADING = "downloading",
  READY = "ready",
  ERROR = "error",
  UP_TO_DATE = "up-to-date",
}

/** Interface for update progress information */
export interface UpdateProgress {
  state: UpdateState;
  downloaded?: number;
  total?: number;
  percent?: number;
  version?: string;
  notes?: string;
  error?: string;
}

/** Dispatch an update status event with the current progress */
function dispatchUpdateStatus(progress: UpdateProgress) {
  const event = new CustomEvent(UPDATE_STATUS_EVENT, {
    detail: progress,
  });
  document.dispatchEvent(event);
}

/** Check for available updates */
export async function checkForUpdates(silent = false): Promise<boolean> {
  try {
    if (!silent) {
      dispatchUpdateStatus({ state: UpdateState.CHECKING });
    }

    const update = await check();

    if (!update) {
      if (!silent) {
        dispatchUpdateStatus({ state: UpdateState.UP_TO_DATE });
      }
      return false;
    }

    dispatchUpdateStatus({
      state: UpdateState.AVAILABLE,
      version: update.version,
      notes: update.body,
    });

    return true;
  } catch (error) {
    console.error("Error checking for updates:", error);
    if (!silent) {
      dispatchUpdateStatus({
        state: UpdateState.ERROR,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return false;
  }
}

/** Download and install available update */
export async function downloadAndInstallUpdate(): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      return;
    }

    dispatchUpdateStatus({ state: UpdateState.DOWNLOADING });

    let downloaded = 0;
    let contentLength = 0;
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started": {
          contentLength = event.data.contentLength ?? 0; // Default to 0 if contentLength is undefined
          break;
        }
        case "Progress": {
          downloaded += event.data.chunkLength;
          const percent = contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;
          dispatchUpdateStatus({
            state: UpdateState.DOWNLOADING,
            downloaded,
            total: contentLength,
            percent,
          });
          break;
        }
        case "Finished": {
          dispatchUpdateStatus({ state: UpdateState.READY });
          break;
        }
      }
    });

    // Relaunch the application after update installation is complete
    await relaunch();
  } catch (error) {
    console.error("Error downloading/installing update:", error);
    dispatchUpdateStatus({
      state: UpdateState.ERROR,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Start the automatic update check on application startup */
export function initAutoUpdateCheck(): void {
  // Check for updates silently on startup
  setTimeout(() => {
    checkForUpdates(true).then((updateAvailable) => {
      if (updateAvailable) {
        console.log("Update available, notifying user");
        // The update event will be handled by the UI listeners
      }
    });
  }, 2000); // Wait 2 seconds before checking to let the app finish loading
}
