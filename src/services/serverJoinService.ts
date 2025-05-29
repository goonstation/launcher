// Server join service for handling connection to servers

import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { ServerInfo } from "./serverService.ts";
import { getSettings, LaunchMethod } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";
import {
  setInGameActivity,
  setLauncherActivity,
} from "./discordRichPresenceService.ts";

/** Join a server using the configured BYOND settings */
export async function joinServer(
  server: ServerInfo,
) {
  try {
    const settings = await getSettings();

    setNoticeMessage(`Joining ${server.name}...`);

    console.log(
      `Joining server using ${settings.launchMethod} at ${settings.byondPath}`,
    );

    const serverAddress = `${server.address}:${server.port}`;
    const byondUrl = `byond://${serverAddress}`;

    console.log(`Server link: ${byondUrl}`);
    if (settings.launchMethod === LaunchMethod.BYOND_PAGER) {
      await openUrl(byondUrl);
      setNoticeMessage(`✅ Opened ${server.short_name} in BYOND pager`);
      await setInGameActivity(server.name);
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
        await setInGameActivity(server.short_name);

        // Simulate DreamSeeker closing after some time for demonstration
        setTimeout(async () => {
          console.log("DreamSeeker instance closed.");
          await setLauncherActivity();
        }, 30000); // Replace with actual DreamSeeker close detection logic
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
