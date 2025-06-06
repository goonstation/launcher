// BYOND notification UI service

import { checkByondVersion, downloadAndInstallByond } from "./byondService.ts";

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
        details: ["Please restart the launcher."],
      });
      byondInstallButton.style.display = "none";
      byondDismissButton.textContent = "Close";
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

    if (!result.isInstalled) {
      showByondNotification("BYOND is not installed.", true, {
        title: "BYOND not installed",
      });
    } else if (
      !result.hasCorrectVersion &&
      result.requiredVersion &&
      result.currentVersion
    ) {
      showByondNotification(
        `BYOND version mismatch.`,
        true,
        {
          title: "BYOND version mismatch",
          details: [
            `Required: ${result.requiredVersion.major}.${result.requiredVersion.minor}`,
            `Installed: ${result.currentVersion.major}.${result.currentVersion.minor}`,
          ],
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
