import { fetch } from "@tauri-apps/plugin-http";
import { getSettings, updateSettings } from "./settingsService.ts";
import { invoke } from "@tauri-apps/api/core";

interface ByondVersion {
  major: number;
  minor: number;
}

const BYOND_CONFIG_URL =
  "https://raw.githubusercontent.com/goonstation/goonstation/refs/heads/master/buildByond.conf";

/** Parse the BYOND version from the config file text */
function parseByondVersion(configText: string): ByondVersion | null {
  try {
    const majorMatch = configText.match(/BYOND_MAJOR_VERSION=(\d+)/);
    const minorMatch = configText.match(/BYOND_MINOR_VERSION=(\d+)/);

    if (!majorMatch || !minorMatch) {
      console.error("Failed to parse BYOND version from config");
      return null;
    }

    return {
      major: parseInt(majorMatch[1], 10),
      minor: parseInt(minorMatch[1], 10),
    };
  } catch (error) {
    console.error("Error parsing BYOND version:", error);
    return null;
  }
}

// Storage of last fetched github version to detect changes is now stored in settings
// Let's remove the in-memory variable and use the settings version instead

/** Fetch the required BYOND version from the Goonstation repository */
export async function fetchRequiredByondVersion(): Promise<
  ByondVersion | null
> {
  try {
    const response = await fetch(BYOND_CONFIG_URL);

    if (!response.ok) {
      console.error("Failed to fetch BYOND config:", response.status);
      return null;
    }

    const configText = await response.text();
    const parsedVersion = parseByondVersion(configText);

    // Get settings and check for version changes
    const settings = await getSettings();

    // Store the fetched version in settings (do this first to ensure we have the latest version)
    if (parsedVersion) {
      // Only update if version is different to reduce settings writes
      if (
        !settings.lastFetchedGithubVersion ||
        settings.lastFetchedGithubVersion.major !== parsedVersion.major ||
        settings.lastFetchedGithubVersion.minor !== parsedVersion.minor
      ) {
        // If version changed, also clear any override
        if (
          settings.lastFetchedGithubVersion && settings.byondVersionOverride
        ) {
          console.log("BYOND version changed in Github, clearing override");
          await updateSettings({
            byondVersionOverride: null,
            lastFetchedGithubVersion: parsedVersion,
          });
        } else {
          // Just update the version without clearing override
          await updateSettings({ lastFetchedGithubVersion: parsedVersion });
        }
      }
    }

    // Check if there's an override in settings
    if (
      settings.byondVersionOverride &&
      settings.byondVersionOverride.trim() !== ""
    ) {
      // Parse the override (expected format: "514.1589")
      const parts = settings.byondVersionOverride.split(".");
      if (parts.length === 2) {
        const major = parseInt(parts[0], 10);
        const minor = parseInt(parts[1], 10);

        if (!isNaN(major) && !isNaN(minor)) {
          return { major, minor };
        }
      }

      console.warn(
        `Invalid BYOND version override format: ${settings.byondVersionOverride}`,
      );
    }

    return parsedVersion;
  } catch (error) {
    console.error("Error fetching required BYOND version:", error);
    return null;
  }
}

/** Get the current installed BYOND version using Rust */
export async function getCurrentByondVersion(): Promise<ByondVersion | null> {
  try {
    const settings = await getSettings();
    const version = await invoke<ByondVersion>("get_byond_version", {
      byondPath: settings.byondPath,
    });
    return version;
  } catch (error) {
    console.error("Error getting current BYOND version:", error);
    return null;
  }
}

/** Check if BYOND is installed and has the correct version */
export async function checkByondVersion(): Promise<{
  isInstalled: boolean;
  hasCorrectVersion: boolean;
  currentVersion: ByondVersion | null;
  requiredVersion: ByondVersion | null;
  githubVersion: ByondVersion | null; // The actual GitHub version
}> {
  try {
    // We need to get the GitHub version directly first, before any overrides
    const settings = await getSettings();
    let githubVersion = null;

    // Get the GitHub version (this will be the real required version from the server)
    try {
      const response = await fetch(BYOND_CONFIG_URL);
      if (response.ok) {
        const configText = await response.text();
        githubVersion = parseByondVersion(configText);

        // Make sure we keep the settings up to date
        if (
          githubVersion &&
          (!settings.lastFetchedGithubVersion ||
            githubVersion.major !== settings.lastFetchedGithubVersion.major ||
            githubVersion.minor !== settings.lastFetchedGithubVersion.minor)
        ) {
          await updateSettings({ lastFetchedGithubVersion: githubVersion });
        }
      }
    } catch (error) {
      console.error("Error fetching GitHub version:", error);
      // Fall back to cached version
      githubVersion = settings.lastFetchedGithubVersion;
    }

    // Now get the potentially overridden version
    const requiredVersion = await fetchRequiredByondVersion();
    if (!requiredVersion) {
      return {
        isInstalled: false,
        hasCorrectVersion: false,
        currentVersion: null,
        requiredVersion: null,
        githubVersion: null,
      };
    }

    let currentVersion = null;
    try {
      currentVersion = await getCurrentByondVersion();
    } catch (error) {
      // Error getting version means BYOND is not installed or path is incorrect
      console.log("BYOND not installed or path incorrect:", error);
    }

    const isInstalled = currentVersion !== null;
    const hasCorrectVersion = isInstalled &&
      currentVersion !== null &&
      currentVersion.major === requiredVersion.major &&
      currentVersion.minor === requiredVersion.minor;

    return {
      isInstalled,
      hasCorrectVersion,
      currentVersion,
      requiredVersion,
      githubVersion,
    };
  } catch (error) {
    console.error("Error checking BYOND version:", error);
    return {
      isInstalled: false,
      hasCorrectVersion: false,
      currentVersion: null,
      requiredVersion: null,
      githubVersion: null,
    };
  }
}

/** Download and install BYOND using the Rust implementation */
export async function downloadAndInstallByond(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const requiredVersion = await fetchRequiredByondVersion();
    if (!requiredVersion) {
      return {
        success: false,
        message: "Failed to determine required BYOND version",
      };
    }

    console.log(
      `Downloading BYOND ${requiredVersion.major}.${requiredVersion.minor}...`,
    );

    // First download the installer using Rust
    const downloadResult = await invoke<{
      success: boolean;
      message: string;
      installer_path: string;
    }>("download_byond_installer", {
      major: requiredVersion.major,
      minor: requiredVersion.minor,
    });

    console.log("Download result: ", downloadResult.message);

    if (!downloadResult.success) {
      return {
        success: false,
        message: downloadResult.message,
      };
    }

    console.log(`Installing BYOND from ${downloadResult.installer_path}...`);

    // Then run the installer using Rust
    const installResult = await invoke<{
      success: boolean;
      message: string;
    }>("install_byond", {
      installerPath: downloadResult.installer_path,
    });

    if (installResult.success) {
      // Update the settings with the default BYOND path if it's not already set
      const settings = await getSettings();
      if (!settings.byondPath || !settings.byondPath.trim()) {
        await updateSettings({
          byondPath: "C:\\Program Files (x86)\\BYOND",
        });
      }
    }

    return installResult;
  } catch (error) {
    console.error("Error installing BYOND:", error);
    return {
      success: false,
      message: `Error installing BYOND: ${String(error)}`,
    };
  }
}

/** Compare two BYOND versions for equality */
function areByondVersionsEqual(
  v1: ByondVersion | null,
  v2: ByondVersion | null,
): boolean {
  if (!v1 || !v2) return false;
  return v1.major === v2.major && v1.minor === v2.minor;
}

/** Check if the required BYOND version has changed from what was last fetched */
export async function hasRequiredVersionChanged(
  currentVersion: ByondVersion | null,
): Promise<boolean> {
  const settings = await getSettings();
  const lastFetchedGithubVersion = settings.lastFetchedGithubVersion;

  if (!currentVersion || !lastFetchedGithubVersion) return false;

  return !areByondVersionsEqual(currentVersion, lastFetchedGithubVersion);
}

/**
 * Check and clear BYOND version override if the github version changed.
 * This ensures the override gets reset every time the recommended version changes.
 */
export async function checkByondVersionAndReset(): Promise<void> {
  try {
    // Fetch fresh version from github
    const response = await fetch(BYOND_CONFIG_URL);
    if (!response.ok) return;

    const configText = await response.text();
    const githubVersion = parseByondVersion(configText);

    const settings = await getSettings();

    // If no github version or no previously cached version, just update cache
    if (!githubVersion || !settings.lastFetchedGithubVersion) {
      await updateSettings({ lastFetchedGithubVersion: githubVersion });
      return;
    }

    // Check if version changed
    if (
      !areByondVersionsEqual(githubVersion, settings.lastFetchedGithubVersion)
    ) {
      console.log("BYOND version changed in Github, clearing any override");
      await updateSettings({
        byondVersionOverride: null,
        lastFetchedGithubVersion: githubVersion,
      });
      console.log("BYOND version override cleared due to version change");
    }
  } catch (error) {
    console.error("Error checking BYOND version override:", error);
  }
}
