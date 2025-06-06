// External links service for handling URL opening
import { openUrl } from "@tauri-apps/plugin-opener";

/** Open an external URL in the default browser */
export async function openExternalLink(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch (error) {
    console.error("Failed to open external link:", error);
  }
}

/** Initialize external links handlers for all anchor tags with target="_blank" */
export function initExternalLinkService(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");

    if (anchor && anchor.getAttribute("target") === "_blank") {
      event.preventDefault();
      const href = anchor.getAttribute("href");

      if (href) {
        openExternalLink(href);
      }
    }
  });
}
