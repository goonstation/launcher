import { destroy, setActivity, start } from "tauri-plugin-drpc";
import { Activity, ActivityType, Timestamps } from "tauri-plugin-drpc/activity";

const APPLICATION_ID = "1377501813862961244";

let currentActivity: Activity | undefined = undefined;

export async function initDiscordRichPresence() {
  try {
    await start(APPLICATION_ID);
    console.log("Discord Rich Presence started.");
    setLauncherActivity();
  } catch (err) {
    console.error("Failed to start Discord Rich Presence:", err);
  }
}

/**
 * Sets the activity to 'In Launcher'.
 */
export async function setLauncherActivity() {
  try {
    const launcherStartTime = new Timestamps(Date.now());
    currentActivity = new Activity()
      .setActivity(ActivityType.Playing)
      .setState("In Launcher")
      .setDetails("Browsing servers")
      .setTimestamps(launcherStartTime);
    await setActivity(currentActivity);
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
    const gameStartTime = new Timestamps(Date.now());
    currentActivity = new Activity()
      .setActivity(ActivityType.Playing)
      .setState("In Game")
      .setDetails(`Playing on ${serverName}`)
      .setTimestamps(gameStartTime);
    await setActivity(currentActivity);
    console.log(
      `Discord Rich Presence activity set to 'In Game' on server: ${serverName}.`,
    );
  } catch (err) {
    console.error("Failed to set in-game activity:", err);
  }
}

export async function cleanupDiscordRichPresence() {
  try {
    await destroy();
    console.log("Discord Rich Presence stopped.");
  } catch (err) {
    console.error("Failed to stop Discord Rich Presence:", err);
  }
}
