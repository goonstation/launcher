// UI service for managing interface elements

import { isPreRoundState } from "./serverDataUtils.ts";
import { joinServer } from "./serverJoinService.ts";
import {
  getSortedServers,
  isServerOnline,
  ServerDataState,
  ServerGameState,
  ServerGroup,
  ServerInfo,
  ShuttleDirection,
  ShuttleLocation,
} from "./serverService.ts";
// Server fields are normalized by `serverService` on receipt

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

/** Format seconds as MM:SS (pads minutes and seconds) */
function fmtMMSS(secs: number | null): string {
  if (secs === null || typeof secs !== "number") return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Create buttons for each server */
export async function createServerButtons(servers: ServerInfo[]) {
  serverButtonsContainer.innerHTML = "";
  const sortedServers = await getSortedServers(servers);
  sortedServers.forEach((server) => {
    const button = document.createElement("button");
    button.className = "server-button styled";

    if (server.group_id === ServerGroup.TOMATO) {
      const tomatoEmoji = document.createElement("div");
      tomatoEmoji.textContent = "🍅";
      tomatoEmoji.className = "tomato-indicator";
      button.appendChild(tomatoEmoji);
    }

    // -- Name --
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

    // -- Map and Round Time --
    const line2 = document.createElement("span");
    line2.style.display = "block";

    const mapSpan = document.createElement("span");
    mapSpan.textContent = `${server.current_map}`;
    mapSpan.className = "map-name";

    const roundInline = document.createElement("span");
    roundInline.className = "round-time-inline";
    roundInline.style.marginLeft = "8px";

    const state = server.gamestate;
    const alwaysRoundSecs = server.round_duration ?? 0;

    if (isPreRoundState(state)) {
      roundInline.textContent = "| STARTING";
    } else if (state === ServerGameState.FINISHED) {
      roundInline.textContent = "| ENDED";
    } else {
      roundInline.textContent = `| ⏱ ${fmtMMSS(alwaysRoundSecs)}`;
    }

    line2.appendChild(mapSpan);
    line2.appendChild(roundInline);

    // -- Player Count --
    const line3 = document.createElement("span");
    line3.style.display = "block";
    line3.textContent = `${server.player_count} players`;

    button.appendChild(line1);
    button.appendChild(line2);
    button.appendChild(line3);

    // -- Shuttle status indicator --
    if (
      server.shuttle_online &&
      typeof server.shuttle_location !== "undefined" &&
      server.shuttle_location !== null &&
      (server.shuttle_location as number) < ShuttleLocation.RETURNED
    ) {
      const timeleft = server.shuttle_timer ?? null;
      if (timeleft && typeof timeleft === "number") {
        const line4 = document.createElement("span");
        line4.style.display = "block";
        line4.className = "shuttle-indicator";

        const loc = server.shuttle_location as number;
        let locstr = "";
        if (loc === ShuttleLocation.STATION) locstr = "ETD";
        else if (loc === ShuttleLocation.TRANSIT) locstr = "ESC";
        else if (server.shuttle_direction === ShuttleDirection.TO_CENTCOMM) {
          locstr = "RCL";
        } else locstr = "ETA";

        line4.textContent = `Shuttle ${locstr} — ${fmtMMSS(timeleft)}`;
        button.appendChild(line4);
      }
    }

    // round time is displayed inline next to the map name above
    const serverOnline = isServerOnline(server);
    button.classList.add(serverOnline ? "server-online" : "server-offline");
    if (server.invisible) {
      button.classList.add("server-invisible");
    }
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
