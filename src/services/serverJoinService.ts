// Server join service for handling connection to servers

import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { ServerInfo } from "./serverService.ts";
import { getSettings, LaunchMethod } from "./settingsService.ts";

/** Join a server using the configured BYOND settings */
export async function joinServer(
  server: ServerInfo,
  noticeElement: HTMLElement,
) {
  try {
    const settings = await getSettings();

    noticeElement.textContent = `Joining ${server.name}...`;

    console.log(
      `Joining server using ${settings.launchMethod} at ${settings.byondPath}`,
    );

    const serverAddress = `${server.address}:${server.port}`;
    const byondUrl = `byond://${serverAddress}`;

    console.log(`Server link: ${byondUrl}`);
    if (settings.launchMethod === LaunchMethod.BYOND_PAGER) {
      await openUrl(byondUrl);
      noticeElement.textContent =
        `✅ Opened ${server.short_name} in BYOND pager`;
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
        noticeElement.textContent =
          `✅ Started DreamSeeker for ${server.short_name}`;
      } catch (execError) {
        console.error("Error launching DreamSeeker:", execError);
        noticeElement.textContent = `❌ Failed to launch DreamSeeker: ${
          execError instanceof Error ? execError.message : String(execError)
        }`;
      }
    } else {
      // For other methods (to be implemented)
      noticeElement.textContent =
        `🚀 Joining ${server.short_name} via ${settings.launchMethod}`;
      setTimeout(() => {
        noticeElement.textContent =
          `✅ Started ${settings.launchMethod} for ${server.short_name}`;
      }, 2000);
    }
  } catch (error) {
    console.error("Error joining server:", error);
    noticeElement.textContent = "❌ Error joining server";
  }
}
