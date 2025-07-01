// Server join service for handling connection to servers

import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { ServerInfo } from "./serverService.ts";
import { getSettings, LaunchMethod } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";
import { muteForGameplay, restoreAudioAfterGameplay } from "./audioService.ts";

type ProcessCheckFn = () => Promise<boolean>;

// Directly invoke Rust commands for Discord Rich Presence
// async function setInGameActivity(serverName: string): Promise<void> {
//   try {
//     await invoke("set_in_game_activity", { serverName });
//     console.log(
//       `Discord Rich Presence set to 'In Game' on server: ${serverName}`,
//     );
//   } catch (err) {
//     console.error("Failed to set in-game activity:", err);
//   }
// }

async function setLauncherActivity(): Promise<void> {
  try {
    await invoke("set_launcher_activity");
    console.log("Discord Rich Presence set to 'In Launcher'");
  } catch (err) {
    console.error("Failed to set launcher activity:", err);
  }
}

let currentJoinedServer: ServerInfo | null = null;
let dreamSeekerMonitorInterval: number | null = null;
let wasProcessRunning = false;

/** Join a server using the configured BYOND settings */
export async function joinServer(
  server: ServerInfo,
) {
  try {
    const settings = await getSettings();

    setNoticeMessage(`Joining ${server.name}...`);

    // Mute background music when joining a server if setting is enabled
    if (settings.autoMuteInGame) {
      muteForGameplay();
    }

    console.log(
      `Joining server using ${settings.launchMethod} at ${settings.byondPath}`,
    );

    const serverAddress = `${server.address}:${server.port}`;
    const byondUrl = `byond://${serverAddress}`;

    console.log(`Server link: ${byondUrl}`);
    if (settings.launchMethod === LaunchMethod.BYOND_PAGER) {
      await openUrl(byondUrl);
      setNoticeMessage(`✅ Opened ${server.short_name} via BYOND pager`);
      // await setInGameActivity(server.name);

      startByondPagerMonitor(server);
    } else if (settings.launchMethod === LaunchMethod.DREAM_SEEKER) {
      console.log(
        `Launching DreamSeeker from ${settings.byondPath} with address ${serverAddress}`,
      );

      const result = await invoke("launch_dreamseeker", {
        byondPath: settings.byondPath,
        serverAddress: serverAddress,
      });

      console.log("DreamSeeker launch result:", result);
      setNoticeMessage(`✅ Started DreamSeeker for ${server.short_name}`);
      // await setInGameActivity(server.name);

      startDreamSeekerMonitor(server);
    } else {
      setNoticeMessage(
        `❌❌ NOT IMPLEMENTED: ${settings.launchMethod} method ❌❌`,
      );
    }
  } catch (error) {
    console.error("Error joining server:", error);
    setNoticeMessage(`❌ Error joining server: ${error}`, true);
  }
}

/**
 * Core monitoring function that handles process tracking
 * Works with different process detection methods
 */
function monitorProcess(
  server: ServerInfo,
  checkFn: ProcessCheckFn,
  checkInterval: number = 5000,
  requirePreviouslyRunning: boolean = false,
) {
  console.log(`Starting process monitor for ${server.name}`);

  // Store current server
  currentJoinedServer = server;

  // Clear any existing monitor
  stopDreamSeekerMonitor();

  // Check immediately to establish initial state if needed
  if (requirePreviouslyRunning) {
    checkFn().then((isRunning) => {
      console.log(`Initial process check: ${isRunning}`);
      wasProcessRunning = isRunning;
    });
  }

  // Start the interval check
  dreamSeekerMonitorInterval = setInterval(async () => {
    try {
      const isRunning = await checkFn();
      console.log(`Process check: ${isRunning}`);

      // Different handling based on configuration
      if (requirePreviouslyRunning) {
        // Only act when we detect the process was running but now isn't
        if (wasProcessRunning && !isRunning && currentJoinedServer) {
          console.log("Process closed, updating Discord presence");
          await handleProcessExit();
        }
        // Update the state for next check
        wasProcessRunning = isRunning;
      } else {
        // Simpler case - just check if it's not running now
        if (!isRunning && currentJoinedServer) {
          console.log("Process closed, updating Discord presence");
          await handleProcessExit();
        }
      }
    } catch (err) {
      console.error("Error checking process status:", err);
    }
  }, checkInterval);

  console.log(`Started monitoring for ${server.name}`);
}

/**
 * Common handling for process exit event
 */
async function handleProcessExit() {
  await setLauncherActivity();
  setNoticeMessage("DreamSeeker closed, back to launcher.");
  stopDreamSeekerMonitor();
}

/**
 * Start monitoring DreamSeeker process when launched directly
 */
function startDreamSeekerMonitor(server: ServerInfo) {
  // Use the core monitoring function with the direct child process check
  monitorProcess(
    server,
    () => invoke<boolean>("is_dreamseeker_running"),
    4000,
    false,
  );
}

/**
 * Start monitoring for DreamSeeker when launched via BYOND pager
 */
export function startByondPagerMonitor(server: ServerInfo) {
  // Use the core monitoring function with the system-wide process check
  // and detection of process state changes
  monitorProcess(
    server,
    () => invoke<boolean>("find_dreamseeker_process"),
    4000,
    true,
  );
}

/** Stop monitoring any DreamSeeker process */
export function stopDreamSeekerMonitor() {
  console.log("Stopping process monitor");

  if (dreamSeekerMonitorInterval !== null) {
    clearInterval(dreamSeekerMonitorInterval);
    dreamSeekerMonitorInterval = null;

    const server = currentJoinedServer?.name || "unknown";
    console.log(`Cleared monitor interval for server: ${server}`);

    if (currentJoinedServer !== null) {
      getSettings().then((settings) => {
        if (settings.autoMuteInGame) {
          console.log("Auto-mute was enabled, restoring audio");
          restoreAudioAfterGameplay().catch(console.error);
        } else {
          console.log("Auto-mute was disabled, not restoring audio");
        }
      });
    }

    // Reset state variables
    currentJoinedServer = null;
    wasProcessRunning = false;
  }
}
