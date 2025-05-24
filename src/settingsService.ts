import { appDataDir } from "@tauri-apps/api/path";
import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";

export enum LaunchMethod {
  DREAM_SEEKER = "dreamseeker",
  BYOND_PAGER = "pager",
}

export interface UserSettings {
  byondPath: string;
  launchMethod: LaunchMethod;
}

const DEFAULT_SETTINGS: UserSettings = {
  byondPath: "C:\\Program Files (x86)\\BYOND",
  launchMethod: LaunchMethod.DREAM_SEEKER,
};
const SETTINGS_FILENAME = "user_settings.json";

let currentSettings: UserSettings | null = null;

export async function getSettings(): Promise<UserSettings> {
  if (currentSettings === null) {
    currentSettings = await initSettings();
  }
  return currentSettings;
}

export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<boolean> {
  const current = await getSettings();
  const updatedSettings = { ...current, ...settings };

  const result = await saveSettings(updatedSettings);
  if (result) {
    document.dispatchEvent(
      new CustomEvent("settings-update", {
        detail: { settings: updatedSettings },
      })
    );
  }
  return result;
}

// -- internal functions --

async function getSettingsFilePath(): Promise<string> {
  return `${await appDataDir()}/${SETTINGS_FILENAME}`;
}

async function initSettings(): Promise<UserSettings> {
  try {
    const settings = await loadSettings();
    if (settings) {
      return settings;
    }

    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error initializing settings:", error);
    return DEFAULT_SETTINGS;
  }
}

async function loadSettings(): Promise<UserSettings | null> {
  try {
    const settingsPath = await getSettingsFilePath();

    const fileExists = await exists(settingsPath);
    if (!fileExists) {
      console.log("No settings file found");
      return null;
    }

    const settingsData = await readTextFile(settingsPath);
    const settings = JSON.parse(settingsData) as UserSettings;

    if (!(settings.launchMethod in LaunchMethod)) {
      settings.launchMethod = DEFAULT_SETTINGS.launchMethod;
    }

    console.log("Settings loaded successfully");
    return settings;
  } catch (error) {
    console.error("Error loading settings:", error);
    return null;
  }
}

async function saveSettings(settings: UserSettings): Promise<boolean> {
  try {
    const settingsPath = await getSettingsFilePath();
    const settingsDir = await appDataDir();

    const dirExists = await exists(settingsDir);
    if (!dirExists) {
      await mkdir(settingsDir, { recursive: true });
    }

    await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log("Settings saved successfully");

    currentSettings = settings;
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}
