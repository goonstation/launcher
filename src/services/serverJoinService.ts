// Server join service for handling connection to servers

import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { ServerInfo } from "./serverService.ts";
import { getSettings, LaunchMethod } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";
import { muteForGameplay, restoreAudioAfterGameplay } from "./audioService.ts";

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
      setNoticeMessage(`✅ Opened ${server.short_name} in BYOND pager`);
      // await setInGameActivity(server.name);
      // Start monitoring for BYOND pager (though this might be less reliable)
      startDreamSeekerMonitor(server);
    } else if (settings.launchMethod === LaunchMethod.DREAM_SEEKER) {
      // Launch DreamSeeker directly with the server address using Rust function
      try {
        console.log(
          `Launching DreamSeeker from ${settings.byondPath} with address ${serverAddress}`,
        );

        // Call the Rust function to launch DreamSeeker
        const result = await invoke("launch_dreamseeker", {
          byondPath: settings.byondPath,
          serverAddress: serverAddress,
        });

        console.log("DreamSeeker launch result:", result);
        setNoticeMessage(`✅ Started DreamSeeker for ${server.short_name}`);
        // await setInGameActivity(server.name);

        // Start monitoring DreamSeeker process
        startDreamSeekerMonitor(server);
      } catch (execError) {
        console.error("Error launching DreamSeeker:", execError);
        setNoticeMessage(
          `❌ Failed to launch DreamSeeker: ${
            execError instanceof Error ? execError.message : String(execError)
          }`,
          true,
        );
      }
    } else {
      // For other methods (to be implemented)
      setNoticeMessage(
        `🚀 Joining ${server.short_name} via ${settings.launchMethod}`,
      );
      setTimeout(() => {
        setNoticeMessage(
          `✅ Started ${settings.launchMethod} for ${server.short_name}`,
        );
      }, 2000);
    }
  } catch (error) {
    console.error("Error joining server:", error);
    setNoticeMessage("❌ Error joining server", true);
  }
}

// Store the current server and monitoring interval
let currentJoinedServer: ServerInfo | null = null;
let dreamSeekerMonitorInterval: number | null = null;

/** Start monitoring DreamSeeker process status */
function startDreamSeekerMonitor(server: ServerInfo) {
  currentJoinedServer = server;

  // Clear any existing monitor
  stopDreamSeekerMonitor();

  // Check every 5 seconds if DreamSeeker is still running
  dreamSeekerMonitorInterval = setInterval(async () => {
    try {
      const isRunning = await invoke<boolean>("is_dreamseeker_running");

      if (!isRunning && currentJoinedServer) {
        console.log("DreamSeeker process closed, updating Discord presence");
        await setLauncherActivity();
        setNoticeMessage("DreamSeeker closed, back to launcher.");
        // This will also restore audio
        stopDreamSeekerMonitor();
      }
    } catch (err) {
      console.error("Error checking DreamSeeker status:", err);
    }
  }, 5000);

  console.log(`Started monitoring DreamSeeker for ${server.name}`);
}

/** Stop monitoring DreamSeeker process status */
export function stopDreamSeekerMonitor() {
  if (dreamSeekerMonitorInterval !== null) {
    clearInterval(dreamSeekerMonitorInterval);
    dreamSeekerMonitorInterval = null;
    currentJoinedServer = null;

    // Get current settings to check if we should restore audio
    getSettings().then((settings) => {
      // Only restore audio if auto-mute was enabled
      if (settings.autoMuteInGame) {
        restoreAudioAfterGameplay().catch(console.error);
      }
    });
  }
}
