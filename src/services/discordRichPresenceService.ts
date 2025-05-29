import { invoke } from "@tauri-apps/api/core";

/**
 * Initializes Discord Rich Presence when the launcher is open.
 */
export async function initDiscordRichPresence() {
  try {
    await invoke("init_discord_rpc");
    console.log("Discord Rich Presence started.");
  } catch (err) {
    console.error("Failed to start Discord Rich Presence:", err);
  }
}

/**
 * Sets the activity to 'In Launcher'.
 */
export async function setLauncherActivity() {
  try {
    await invoke("set_launcher_activity");
    console.log("Discord Rich Presence activity set to 'In Launcher'.");
  } catch (err) {
    console.error("Failed to set launcher activity:", err);
  }
}

/**
 * Sets the activity to 'In Game' with the specified server details.
 * @param serverName - The name of the server.
 */
export async function setInGameActivity(serverName: string) {
  try {
    await invoke("set_in_game_activity", { serverName });
    console.log(
      `Discord Rich Presence activity set to 'In Game' on server: ${serverName}.`,
    );
  } catch (err) {
    console.error("Failed to set in-game activity:", err);
  }
}

/**
 * Cleans up Discord Rich Presence when the launcher is closed.
 */
export async function cleanupDiscordRichPresence() {
  try {
    await invoke("cleanup_discord_rpc");
    console.log("Discord Rich Presence stopped.");
  } catch (err) {
    console.error("Failed to stop Discord Rich Presence:", err);
  }
}
