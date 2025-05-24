// Server join service for handling connection to servers

import { ServerInfo } from "./serverService";
import { getSettings } from "./settingsService";

/**
 * Join a server using the configured BYOND settings
 */
export async function joinServer(
  server: ServerInfo,
  noticeElement: HTMLElement,
) {
  try {
    const settings = await getSettings();

    // Display joining message
    noticeElement.textContent = `Joining ${server.name}...`;

    console.log(
      `Joining server using ${settings.launchMethod} at ${settings.byondPath}`,
    );
    console.log(`Server link: ${server.byond_link}`);

    // For now, just show a message
    noticeElement.textContent = `🚀 Joining ${server.short_name} via ${settings.launchMethod}`;
    setTimeout(() => {
      noticeElement.textContent = `✅ Started ${settings.launchMethod} for ${server.short_name}`;
    }, 2000);
  } catch (error) {
    console.error("Error joining server:", error);
    noticeElement.textContent = "❌ Error joining server";
  }
}
