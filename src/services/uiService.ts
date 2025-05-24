// UI service for managing interface elements

import { joinServer } from "./serverJoinService.ts";
import {
  getSortedServers,
  isServerOnline,
  ServerDataState,
  ServerInfo,
} from "./serverService.ts";

// DOM Elements
let serverButtonsContainer: HTMLElement;
let refreshButton: HTMLButtonElement;
let noticeLabel: HTMLElement;

/**
 * Initialize UI elements
 */
export function initUIService(
  buttonContainer: HTMLElement,
  refreshBtn: HTMLButtonElement,
  noticeElement: HTMLElement,
) {
  serverButtonsContainer = buttonContainer;
  refreshButton = refreshBtn;
  noticeLabel = noticeElement;
}

/**
 * Update the status notice based on server data state
 */
export function updateStatusNotice(
  state: ServerDataState,
  errorMessage: string | null = null,
) {
  // Enable the refresh button for all states except LOADING
  refreshButton.disabled = state === ServerDataState.LOADING;

  // Remove all state classes
  noticeLabel.classList.remove("warning", "error", "refreshing");

  // Set the message based on the state
  switch (state) {
    case ServerDataState.LOADING:
      noticeLabel.textContent = "⏳ Fetching server status...";
      break;

    case ServerDataState.LOADED_FRESH:
      noticeLabel.textContent = `✅ server status updated`;
      break;

    case ServerDataState.LOADED_CACHE:
      noticeLabel.textContent = `⚠️ using cached data - connection failed`;
      noticeLabel.classList.add("warning");
      if (errorMessage) {
        console.warn(`Connection issue: ${errorMessage}`);
      }
      break;

    case ServerDataState.REFRESHING:
      noticeLabel.textContent = `⏳ refreshing...`;
      noticeLabel.classList.add("refreshing");
      break;

    case ServerDataState.ERROR:
      noticeLabel.textContent = errorMessage ||
        "❌ error updating servers - please try again";
      noticeLabel.classList.add("error");
      break;
  }
}

/**
 * Create buttons for each server
 */
export function createServerButtons(servers: ServerInfo[]) {
  // Clear existing buttons
  serverButtonsContainer.innerHTML = "";

  const sortedServers = getSortedServers(servers);

  // Create buttons for each server
  sortedServers.forEach((server) => {
    const button = document.createElement("button");
    button.className = "server-button styled";

    // Add separate lines via spans
    const line1 = document.createElement("span");
    line1.style.display = "block";
    line1.textContent = server.short_name;

    const line2 = document.createElement("span");
    line2.style.display = "block";
    line2.textContent = "Cogmap2";

    const line3 = document.createElement("span");
    line3.style.display = "block";
    line3.textContent = `69 online`;

    button.appendChild(line1);
    button.appendChild(line2);
    button.appendChild(line3);

    // Add status indicator to the button
    const serverOnline = isServerOnline(server);
    button.classList.add(serverOnline ? "server-online" : "server-offline");

    // Add server ID as data attribute for reference
    button.dataset.serverId = server.server_id;

    // Add click handler
    button.addEventListener("click", () => {
      // Only allow joining online servers
      if (serverOnline) {
        joinServer(server, noticeLabel);
      } else {
        noticeLabel.textContent = `${server.name} is currently offline.`;
      }
    });

    serverButtonsContainer.appendChild(button);
  });
}

/**
 * Set notice message
 */
export function setNoticeMessage(message: string, isError = false) {
  noticeLabel.textContent = message;
  noticeLabel.classList.toggle("error", isError);
}
