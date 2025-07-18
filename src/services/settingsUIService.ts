// Settings UI service for managing settings interface

import { fetchRequiredByondVersion } from "./byondService.ts";
import {
  getSettings,
  LaunchMethod,
  updateSettings,
} from "./settingsService.ts";
import { fetchServerStatus } from "./serverService.ts";
import { setNoticeMessage } from "./uiService.ts";
import packageInfo from "../../package.json" with { type: "json" };

/**
 * Initialize settings UI service
 */
export function initSettingsUIService(
  settingsBtn: HTMLButtonElement,
) {
  settingsBtn.addEventListener("click", () => {
    const modal = document.querySelector("#settings-modal")!;
    const isCurrentlyHidden = modal.classList.contains("hidden");
    toggleSettingsModal(isCurrentlyHidden);
  });

  const closeModalButton = document.querySelector("#close-modal-button")!;
  closeModalButton.addEventListener("click", () => {
    toggleSettingsModal(false);
  });

  const settingsForm = document.querySelector("#settings-modal form")!;
  settingsForm.addEventListener("submit", handleSettingsSubmit);

  const repoNotice = document.querySelector("#version")!;
  repoNotice.textContent = `Version ${packageInfo.version}`;
  repoNotice.setAttribute("title", `Version ${packageInfo.version}`);
}

/**
 * Toggle the settings modal
 */
export function toggleSettingsModal(show: boolean) {
  const modal = document.querySelector("#settings-modal");
  if (!modal) return;

  // If showing the modal, load current settings
  if (show) {
    loadSettingsIntoForm();
  }

  modal.classList.toggle("hidden", !show);
}

/**
 * Handle settings form submission
 */
async function handleSettingsSubmit(event: Event) {
  event.preventDefault();

  // Get form elements
  const byondPathInput = document.querySelector<HTMLInputElement>(
    "#byond-path",
  );
  const launchMethodSelect = document.querySelector<HTMLSelectElement>(
    "#byond-mode",
  );
  const byondVersionOverrideInput = document.querySelector<HTMLInputElement>(
    "#byond-version-override",
  );
  const autoMuteCheckbox = document.querySelector<HTMLInputElement>(
    "#auto-mute-ingame",
  );
  const showInvisibleServersCheckbox = document.querySelector<HTMLInputElement>(
    "#show-invisible-servers",
  );

  // Validate inputs exist

  if (
    !byondPathInput || !launchMethodSelect || !byondVersionOverrideInput ||
    !showInvisibleServersCheckbox
  ) {
    console.error("Form inputs not found");
    return;
  }

  try {
    const success = await updateSettings({
      byondPath: byondPathInput.value.trim(),
      launchMethod: launchMethodSelect.value as LaunchMethod,
      byondVersionOverride: byondVersionOverrideInput.value.trim() || null,
      autoMuteInGame: autoMuteCheckbox ? autoMuteCheckbox.checked : true,
      showInvisibleServers: showInvisibleServersCheckbox.checked,
    });

    if (success) {
      setNoticeMessage("✅ settings saved successfully");
      toggleSettingsModal(false);
      fetchServerStatus(); // trigger an update
    }
  } catch (error) {
    console.error("error saving settings:", error);
    setNoticeMessage("❌ error saving settings", true);
  }
}

async function loadSettingsIntoForm() {
  try {
    const settings = await getSettings();
    const requiredVersion = await fetchRequiredByondVersion();

    const byondPathInput = document.querySelector<HTMLInputElement>(
      "#byond-path",
    )!;
    const launchMethodSelect = document.querySelector<HTMLSelectElement>(
      "#byond-mode",
    )!;
    const byondVersionOverrideInput = document.querySelector<HTMLInputElement>(
      "#byond-version-override",
    )!;
    const autoMuteCheckbox = document.querySelector<HTMLInputElement>(
      "#auto-mute-ingame",
    )!;
    const showInvisibleCheckbox = document.querySelector<
      HTMLInputElement
    >(
      "#show-invisible-servers",
    )!;

    byondPathInput.value = settings.byondPath;
    launchMethodSelect.value = settings.launchMethod;
    byondVersionOverrideInput.value = settings.byondVersionOverride || "";
    autoMuteCheckbox.checked = settings.autoMuteInGame;
    showInvisibleCheckbox.checked = settings.showInvisibleServers ??
      false;

    if (requiredVersion) {
      byondVersionOverrideInput.placeholder =
        `${requiredVersion.major}.${requiredVersion.minor} (leave empty for recommended)`;
    }
  } catch (error) {
    console.error("Error loading settings into form:", error);
  }
}
