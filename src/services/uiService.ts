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

export function initUIService(
  buttonContainer: HTMLElement,
  refreshBtn: HTMLButtonElement,
  noticeElement: HTMLElement,
) {
  serverButtonsContainer = buttonContainer;
  refreshButton = refreshBtn;
  noticeLabel = noticeElement;
}

/** Update the status notice based on server data state */
export function updateStatusNotice(
  state: ServerDataState,
  errorMessage: string | null = null,
) {
  // No constant refreshing
  refreshButton.disabled = state === ServerDataState.LOADING ||
    state === ServerDataState.REFRESHING;

  // Remove all state classes
  noticeLabel.classList.remove("warning", "error", "refreshing");

  // Set the message based on the state
  switch (state) {
    case ServerDataState.LOADING:
      setNoticeMessage("⏳ Fetching server status...");
      break;

    case ServerDataState.LOADED_FRESH:
      setNoticeMessage(`✅ server status updated`);
      break;

    case ServerDataState.LOADED_CACHE:
      setNoticeMessage(`⚠️ using cached data - connection failed`);
      noticeLabel.classList.add("warning");
      if (errorMessage) {
        console.warn(`Connection issue: ${errorMessage}`);
      }
      break;

    case ServerDataState.REFRESHING:
      setNoticeMessage(`⏳ refreshing...`);
      noticeLabel.classList.add("refreshing");
      break;

    case ServerDataState.ERROR:
      setNoticeMessage(
        errorMessage || "❌ error updating servers - please try again",
        true,
      );
      break;
  }
}

/** Create buttons for each server */
export async function createServerButtons(servers: ServerInfo[]) {
  serverButtonsContainer.innerHTML = "";
  const sortedServers = await getSortedServers(servers);
  sortedServers.forEach((server) => {
    const button = document.createElement("button");
    button.className = "server-button styled";
    const line1 = document.createElement("span");
    line1.style.display = "block";
    const nameMatch = server.name.match(/^(.+?):\s*(.+)$/);
    let cleanShortName = server.short_name.replace(/goon/i, "").trim();
    if (server.id == 1 || server.id == 2) {
      cleanShortName += " Classic";
    }
    if (nameMatch && nameMatch[2]) {
      line1.textContent = "";
      const nicknameSpan = document.createElement("span");
      nicknameSpan.textContent = nameMatch[2] + " ";
      line1.appendChild(nicknameSpan);
      const shortNameSpan = document.createElement("span");
      shortNameSpan.textContent = `(${cleanShortName})`;
      shortNameSpan.style.fontSize = "0.9em";
      line1.appendChild(shortNameSpan);
    } else {
      line1.textContent = cleanShortName;
    }
    const line2 = document.createElement("span");
    line2.style.display = "block";
    line2.textContent = `${server.current_map}`;
    const line3 = document.createElement("span");
    line3.style.display = "block";
    line3.textContent = `${server.player_count} players`;
    button.appendChild(line1);
    button.appendChild(line2);
    button.appendChild(line3);
    const serverOnline = isServerOnline(server);
    button.classList.add(serverOnline ? "server-online" : "server-offline");
    button.addEventListener("click", () => {
      if (serverOnline) {
        joinServer(server);
      } else {
        setNoticeMessage(`❌ ${server.name} is currently offline.`);
      }
    });
    serverButtonsContainer.appendChild(button);
  });
}

/** Set notice message */
export function setNoticeMessage(message: string, isError = false) {
  noticeLabel.textContent = message;
  noticeLabel.classList.toggle("error", isError);
}
