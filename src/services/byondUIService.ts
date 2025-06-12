// BYOND notification UI service

import { checkByondVersion, downloadAndInstallByond } from "./byondService.ts";
import { getSettings } from "./settingsService.ts";
import { relaunch } from "@tauri-apps/plugin-process";

// DOM Elements
let byondNotification: HTMLElement;
let byondText: HTMLElement;
let byondInstallButton: HTMLButtonElement;
let byondDismissButton: HTMLButtonElement;

/** Initialize the BYOND notification UI service */
export function initByondUIService() {
  byondNotification = document.getElementById("byond-notification")!;
  byondText = document.getElementById("byond-text")!;
  byondInstallButton = document.getElementById(
    "byond-install-button",
  ) as HTMLButtonElement;
  byondDismissButton = document.getElementById(
    "byond-dismiss-button",
  ) as HTMLButtonElement;

  byondInstallButton.addEventListener("click", async () => {
    showByondNotification("Installing BYOND...", true);
    byondInstallButton.disabled = true;

    const result = await downloadAndInstallByond();

    if (result.success) {
      showByondNotification("", false, {
        title: "BYOND installed!",
        details: ["Restarting launcher..."],
      });
      byondInstallButton.style.display = "none";
      byondDismissButton.style.display = "none";

      // Restart launcher after 1 second
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (error) {
          console.error("Failed to restart launcher:", error);
          showByondNotification("", false, {
            title: "BYOND installed!",
            details: ["Please restart the launcher manually."],
          });
        }
      }, 1_000);
    } else {
      showByondNotification(result.message, true);
      byondInstallButton.disabled = false;
    }
  });

  byondDismissButton.addEventListener("click", () => {
    hideByondNotification();
  });
}

/** Show BYOND notification with a message and install option */
export function showByondNotification(
  message: string,
  showInstall = false,
  options?: {
    title?: string;
    details?: string[];
  },
) {
  if (options && (options.title || options.details)) {
    // If we have structured content, use it
    let htmlContent = options.title ? `${options.title}` : "";

    if (options.details && options.details.length > 0) {
      options.details.forEach((detail) => {
        htmlContent += `<br><span style='font-size:0.95em'>${detail}</span>`;
      });
    }

    byondText.innerHTML = htmlContent;
  } else {
    // Fallback to plain text message
    byondText.textContent = message;
  }

  byondNotification.classList.remove("hidden");
  byondInstallButton.style.display = showInstall ? "inline-block" : "none";
}

/** Check BYOND version and show notification if needed */
export async function checkAndShowByondStatus(): Promise<void> {
  try {
    const result = await checkByondVersion();
    const settings = await getSettings();

    if (!result.isInstalled) {
      showByondNotification("BYOND is not installed.", true, {
        title: "BYOND not installed",
      });
    } else if (
      !result.hasCorrectVersion &&
      result.requiredVersion &&
      result.currentVersion
    ) {
      // Build notification details
      const details = [];

      // First, show GitHub required version
      if (result.githubVersion) {
        details.push(
          `Recommended: ${result.githubVersion.major}.${result.githubVersion.minor}`,
        );
      }

      // Show override if active
      if (settings.byondVersionOverride) {
        details.push(`⚠️ Override: ${settings.byondVersionOverride}`);
      }

      // Show installed version
      details.push(
        `Installed: ${result.currentVersion.major}.${result.currentVersion.minor}`,
      );

      showByondNotification(
        `BYOND version mismatch.`,
        true,
        {
          title: "BYOND version mismatch",
          details: details,
        },
      );
    }
  } catch (error) {
    console.error("Error checking BYOND version:", error);
  }
}

/** Hide BYOND notification */
export function hideByondNotification() {
  byondNotification.classList.add("hidden");
}
