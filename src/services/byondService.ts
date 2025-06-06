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
    return parseByondVersion(configText);
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
}> {
  try {
    const requiredVersion = await fetchRequiredByondVersion();
    if (!requiredVersion) {
      return {
        isInstalled: false,
        hasCorrectVersion: false,
        currentVersion: null,
        requiredVersion: null,
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
    };
  } catch (error) {
    console.error("Error checking BYOND version:", error);
    return {
      isInstalled: false,
      hasCorrectVersion: false,
      currentVersion: null,
      requiredVersion: null,
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
