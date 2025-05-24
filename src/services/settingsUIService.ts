// Settings UI service for managing settings interface

import { LaunchMethod, getSettings, updateSettings } from "./settingsService";
import { setNoticeMessage } from "./uiService";

let noticeLabel: HTMLElement;

/**
 * Initialize settings UI service
 */
export function initSettingsUIService(
  settingsBtn: HTMLButtonElement,
  noticeLabelElement: HTMLElement,
) {
  noticeLabel = noticeLabelElement;

  // Set up settings button click handler
  settingsBtn.addEventListener("click", () => {
    const modal = document.querySelector("#settings-modal");
    if (modal) {
      const isCurrentlyHidden = modal.classList.contains("hidden");
      toggleSettingsModal(isCurrentlyHidden);
    }
  });

  // Set up close modal button
  const closeModalButton = document.querySelector("#close-modal-button");
  if (closeModalButton) {
    closeModalButton.addEventListener("click", () => {
      toggleSettingsModal(false);
    });
  }

  // Set up settings form submission
  const settingsForm = document.querySelector("#settings-modal form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", handleSettingsSubmit);
  }
}

/**
 * Toggle the settings modal
 */
export function toggleSettingsModal(show: boolean) {
  const modal = document.querySelector("#settings-modal");
  if (!modal) return;
  modal.classList.toggle("hidden", !show);

  // If showing the modal, load current settings
  if (show) {
    loadSettingsIntoForm();
  }
}

/**
 * Handle settings form submission
 */
async function handleSettingsSubmit(event: Event) {
  event.preventDefault();

  // Get form elements
  const byondPathInput =
    document.querySelector<HTMLInputElement>("#byond-path");
  const launchMethodSelect =
    document.querySelector<HTMLSelectElement>("#byond-mode");

  // Validate inputs exist
  if (!byondPathInput || !launchMethodSelect) {
    console.error("Form inputs not found");
    return;
  }

  try {
    // Update settings
    const success = await updateSettings({
      byondPath: byondPathInput.value.trim(),
      launchMethod: launchMethodSelect.value as LaunchMethod,
    });

    if (success) {
      // Provide feedback
      setNoticeMessage("✅ Settings saved successfully");
      setTimeout(() => {
        if (noticeLabel.textContent === "✅ Settings saved successfully") {
          setNoticeMessage("");
        }
      }, 3000);

      // Close the modal
      toggleSettingsModal(false);
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    setNoticeMessage("❌ Error saving settings", true);
  }
}

/**
 * Load settings into the form
 */
async function loadSettingsIntoForm() {
  try {
    // Get current settings
    const settings = await getSettings();

    // Get form elements
    const byondPathInput =
      document.querySelector<HTMLInputElement>("#byond-path");
    const launchMethodSelect =
      document.querySelector<HTMLSelectElement>("#byond-mode");

    // Update form values
    if (byondPathInput) {
      byondPathInput.value = settings.byondPath;
    }

    if (launchMethodSelect) {
      launchMethodSelect.value = settings.launchMethod;
    }
  } catch (error) {
    console.error("Error loading settings into form:", error);
  }
}
